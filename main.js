/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Animated,
  AppRegistry,
  PanResponder,
  ScrollView,
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

import { mangleData, drawLine, textPos } from './pubmap';

var pubs = require('./pubs.json');

export default class PubMap extends Component {
  constructor() {
    super(...arguments);
    this.state = {
      x: 0,
      y: 0,
      hover: false
    };

    this.state = {
      zoom: 2,
      minZoom: 1,
      layoutKnown: false,
      isZooming: false,
      isMoving: false,
      initialDistance: null,
      initialX: null,
      initialY: null,
      offsetTop: 0,
      offsetLeft: 0,
      initialTop: 0,
      initialLeft: 0,
      initialTopWithoutZoom: 0,
      initialLeftWithoutZoom: 0,
      initialZoom: 1,
      top: 0,
      left: 0,
      width: 375,
      height: 375
    }

    this.G = G;
  }

  componentWillMount = () => {
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
      onPanResponderGrant: (evt, gestureState) => { },
      onPanResponderMove: (evt, gestureState) => {
        let touches = evt.nativeEvent.touches;
        if (touches.length == 2) {
          let touch1 = touches[0];
          let touch2 = touches[1];

          this.processPinch(touches[0].pageX, touches[0].pageY,
            touches[1].pageX, touches[1].pageY);
        } else if (touches.length == 1 && !this.state.isZooming) {
          this.processTouch(touches[0].pageX, touches[0].pageY);
        }
      },
      onPanResponderTerminationRequest: (evt, gestureState) => true,
      onPanResponderRelease: (evt, gestureState) => {
        this.setState({
          isZooming: false,
          isMoving: false
        });
      },
      onPanResponderTerminate: (evt, gestureState) => { },
      onShouldBlockNativeResponder: (evt, gestureState) => true,
    });
  };

  processPinch(x1, y1, x2, y2) {
    let distance = calcDistance(x1, y1, x2, y2);
    let center = calcCenter(x1, y1, x2, y2);

    if (!this.state.isZooming) {
      let offsetByZoom = calcOffsetByZoom(this.state.width, this.state.height,
        this.state.width, this.state.height, this.state.zoom);
      this.setState({
        isZooming: true,
        initialDistance: distance,
        initialX: center.x,
        initialY: center.y,
        initialTop: this.state.top,
        initialLeft: this.state.left,
        initialZoom: this.state.zoom,
        initialTopWithoutZoom: this.state.top - offsetByZoom.top,
        initialLeftWithoutZoom: this.state.left - offsetByZoom.left,
      });

    } else {
      let touchZoom = distance / this.state.initialDistance;
      let zoom = touchZoom * this.state.initialZoom > this.state.minZoom
        ? touchZoom * this.state.initialZoom : this.state.minZoom;

      let offsetByZoom = calcOffsetByZoom(this.state.width, this.state.height,
        this.state.width, this.state.height, zoom);
      let left = (this.state.initialLeftWithoutZoom * touchZoom) + offsetByZoom.left;
      let top = (this.state.initialTopWithoutZoom * touchZoom) + offsetByZoom.top;

      this.setState({
        zoom: zoom,
        left: left > 0 ? 0 : maxOffset(left, this.state.width, this.props.imageWidth * zoom),
        top: top > 0 ? 0 : maxOffset(top, this.state.height, this.props.imageHeight * zoom),
      });
    }
  }

  processTouch(x, y) {
    if (!this.state.isMoving) {
      this.setState({
        isMoving: true,
        initialX: x,
        initialY: y,
        initialTop: this.state.top,
        initialLeft: this.state.left,
      });
    } else {
      let left = this.state.initialLeft + x - this.state.initialX;
      let top = this.state.initialTop + y - this.state.initialY;

      this.setState({
        left: left > 0 ? 0 : maxOffset(left, this.state.width, this.props.imageWidth * this.state.zoom),
        top: top > 0 ? 0 : maxOffset(top, this.state.height, this.props.imageHeight * this.state.zoom),
      });
    }
  }

  render() {
    var zoomScale = 1;
    var width = zoomScale * 375;
    var height = zoomScale * 250;

    var data = mangleData(pubs);

    var xScale = d3.scaleLinear()
      .domain([-40, 100])
      .range([0, width]);

    var yScale = d3.scaleLinear()
      .domain([-46, 46])
      .range([height, 0]);

    var lineWidthMultiplier = 1.2;
    var lineWidth = lineWidthMultiplier * (xScale(1) - xScale(0));

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

    var river = data.river;
    var lines = data.lines.lines;
    var interchanges = data.stations.interchanges();
    var stations = data.stations.normalStations();
    var labels = data.stations.toArray();

    var riverElement = (
      <Path x={this.state.left} y={this.state.top} scale={this.state.zoom} d={drawLine(data.river, xScale, yScale, lineWidth)} strokeWidth={lineWidth * 2} fill="none" stroke="#C4E8F8" ></Path>
    );

    var lineElements = lines.map((l, index) => {
      return (
        <Path x={this.state.left} y={this.state.top} scale={this.state.zoom} d={drawLine(l, xScale, yScale, lineWidth)} strokeWidth={lineWidth / 2} fill="none" stroke={l.color} strokeWidth="4" key={index}></Path>
      );
    });

    var interchangeElements = interchanges.map((i, index) => {
      return (
        <G
          x={this.state.left}
          y={this.state.top}
          scale={this.state.zoom}
          key={index}
          >
          <Path
            d={markerFunction(i)}
            x={xScale(i.x + i.marker[0].shiftX * lineWidthMultiplier)}
            y={yScale(i.y + i.marker[0].shiftY * lineWidthMultiplier)}
            strokeWidth={lineWidth / 2}
            fill="#FFF"
            stroke="#000"
            onPress={() => alert('Interchange' + index)}
            key={index}
            >
          </Path>
        </G>
      );
    });

    var stationElements = stations.map((s, index) => {
      return (
        <Path x={this.state.left} y={this.state.top} scale={this.state.zoom} d={stationFunction(s)} strokeWidth={lineWidth / 2} fill="none" stroke={s.color} onPress={() => alert('Station' + index)} key={index}></Path>
      );
    });

    var labelElements = labels.map((l, index) => {
      return (
        <G
          x={this.state.left}
          y={this.state.top}
          scale={this.state.zoom}
          key={index}
          >
          <Text
            x={xScale(l.x + l.labelShiftX) + textPos(l, lineWidth).pos[0]}
            y={yScale(l.y + l.labelShiftY + 1) - textPos(l, lineWidth).pos[1]}
            textAnchor={textPos(l).textAnchor}
            fontSize="3.5"
            onPress={() => alert(l.label)}
            key={index}
            >
            {l.label}
          </Text>
        </G>
      );
    });
    // x={this.state.left} y={this.state.top} scale={this.state.zoom}
    return (
      <View {...this._panResponder.panHandlers}>
        <Svg
          width={375} //"375"
          height={667} //"667"
          >
          {riverElement}
          {lineElements}
          {interchangeElements}
          {stationElements}
          {labelElements}
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



function calcDistance(x1, y1, x2, y2) {
  let dx = Math.abs(x1 - x2)
  let dy = Math.abs(y1 - y2)
  return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

function calcCenter(x1, y1, x2, y2) {

  function middle(p1, p2) {
    return p1 > p2 ? p1 - (p1 - p2) / 2 : p2 - (p2 - p1) / 2;
  }

  return {
    x: middle(x1, x2),
    y: middle(y1, y2),
  };
}

function maxOffset(offset, windowDimension, imageDimension) {
  let max = windowDimension - imageDimension;
  if (max >= 0) {
    return 0;
  }
  return offset < max ? max : offset;
}

function calcOffsetByZoom(width, height, imageWidth, imageHeight, zoom) {
  let xDiff = imageWidth * zoom - width;
  let yDiff = imageHeight * zoom - height;
  return {
    left: -xDiff / 2,
    top: -yDiff / 2,
  }
}

