/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  PanResponder,
  StyleSheet,
  View
} from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  G,
  LinearGradient,
  RadialGradient,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Symbol,
  Text,
  Use,
  Defs,
  Stop
} from 'react-native-svg';
import * as d3 from 'd3';

import { mangleData, drawLine } from './pubmap';

var pubs = require('./pubs.json');

export default class PubMap extends Component {
  constructor() {
    super(...arguments);
    this.state = {
      x: 0,
      y: 0,
      hover: false
    };
  }

  componentWillMount = () => {
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (e, gestureState) => { console.log(e); return true; },
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderRelease: this._handlePanResponderEnd,
      onPanResponderTerminate: this._handlePanResponderEnd
    });
  };

  _previousLeft = 0;

  _previousTop = 0;

  _handlePanResponderMove = (e, gestureState) => {
    this.setState({
      x: this._previousLeft + gestureState.dx,
      y: this._previousTop + gestureState.dy
    });
  };

  _handlePanResponderGrant = () => {
  };

  _handlePanResponderEnd = (e, gestureState) => {
    this._previousLeft += gestureState.dx;
    this._previousTop += gestureState.dy;
  };

  render() {
    var data = mangleData(pubs);

    var lineWidth = 4;
    var lineWidthMultiplier = 1.2;

    var xScale = d3.scaleLinear()
      .domain([-30, 50])
      .range([0, 400]);

    var yScale = d3.scaleLinear()
      .domain([-30, 50])
      .range([0, 400]);

    var markerFunction = d3.arc()
      .innerRadius(0)
      .outerRadius(lineWidth)
      .startAngle(0)
      .endAngle(2 * Math.PI);

    var lineFunction = d3.line()
      .x(function (d) { return xScale(d[0]); })
      .y(function (d) { return yScale(d[1]); });

    var stationFunction = function (d) {
      var dir;

      var sqrt2 = Math.sqrt(2);

      switch (d.labelPos.toLowerCase()) {
        case "n":
          dir = [0, 1];
          break;
        case "ne":
          dir = [1 / sqrt2, 1 / sqrt2];
          break;
        case "e":
          dir = [1, 0];
          break;
        case "se":
          dir = [1 / sqrt2, -1 / sqrt2];
          break;
        case "s":
          dir = [0, -1];
          break;
        case "sw":
          dir = [-1 / sqrt2, -1 / sqrt2];
          break;
        case "w":
          dir = [-1, 0];
          break;
        case "nw":
          dir = [-1 / sqrt2, 1 / sqrt2];
          break;
        default:
          break;
      }

      return lineFunction([[d.x + (d.shiftX * lineWidthMultiplier) + lineWidthMultiplier / 2.05 * dir[0], d.y + (d.shiftY * lineWidthMultiplier) + lineWidthMultiplier / 2.05 * dir[1]], [d.x + (d.shiftX * lineWidthMultiplier) + lineWidthMultiplier * dir[0], d.y + (d.shiftY * lineWidthMultiplier) + lineWidthMultiplier * dir[1]]]);
    }

    var lines = data.lines.lines;
    var interchanges = data.stations.interchanges();
    var stations = data.stations.normalStations();
    var labels = data.stations.toArray();

    var lineElements = lines.map((l, index) => {
      return (
        <Path d={drawLine(l, xScale, yScale, lineWidth)} strokeWidth={lineWidth / 2} fill="none" stroke={l.color} strokeWidth="4" key={index}></Path>
      );
    });

    var interchangeElements = interchanges.map((i, index) => {
      return (
        <Path d={markerFunction(i)} x={xScale(i.x)} y={yScale(i.y)} strokeWidth={lineWidth / 2} fill="#FFF" stroke="#000" onPress={() => alert('Interchange' + index)} key={index}></Path>
      );
    });

    var stationElements = stations.map((s, index) => {
      return (
        <Path d={stationFunction(s)} strokeWidth={lineWidth / 2} fill="none" stroke={s.color} onPress={() => alert('Station' + index)} key={index}></Path>
      );
    });

    var labelElements = labels.map((l, index) => {
      return (
        <Text x={xScale(l.x)} y={yScale(l.y)} key={index} >Station</Text>
      );
    });

    return (
      <View {...this._panResponder.panHandlers} >
        <Svg
          height="800"
          width="400"
          >
          <G
            x={this.state.x}
            y={this.state.y}
            >
            {lineElements}
            {interchangeElements}
            {stationElements}
            {labelElements}
          </G>
          <Rect height="100%" width="100%" fill="gray" fillOpacity="0.1" ></Rect>
        </Svg>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

AppRegistry.registerComponent('PubMap', () => PubMap);
