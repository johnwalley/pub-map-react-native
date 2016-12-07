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
      onStartShouldSetPanResponder: this._alwaysTrue,
      onMoveShouldSetPanResponder: this._alwaysTrue,
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderRelease: this._handlePanResponderEnd,
      onPanResponderTerminate: this._handlePanResponderEnd
    });
  };

  _previousLeft = 0;

  _previousTop = 0;

  _alwaysTrue = () => true;

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

    var lines = data.lines.lines;
    var interchanges = data.stations.interchanges();

    var lineElements = lines.map((l, index) => {
      return (
        <Path d={drawLine(l, xScale, yScale, lineWidth)} strokeWidth={lineWidth / 2} fill="none" stroke={l.color} key={index}></Path>
      );
    });

    var interchangeElements = interchanges.map((i, index) => {
      return (
        <Path d={markerFunction(i)} x={xScale(i.x)} y={yScale(i.y)} strokeWidth={lineWidth / 2} fill="#FFF" stroke="#000" onPress={() => alert('Press on interchange')} key={index}></Path>
      );
    });

    return (
      <Svg
        height="400"
        width="400"
        >
        <Rect height="100%" width="100%" fill="gray" {...this._panResponder.panHandlers} ></Rect>
        <G
          x={this.state.x}
          y={this.state.y}
          >
          {interchangeElements}
        </G>
      </Svg>
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

function mangleData(data) {
  var mangledData = {};

  // Data manipulation
  mangledData.raw = data.lines;
  mangledData.river = data.river;
  mangledData.stations = extractStations(data);
  mangledData.lines = extractLines(data.lines);

  return mangledData;
}

function extractStations(data) {

  data.lines.forEach(function (line) {
    for (var node = 0; node < line.nodes.length; node++) {
      var d = line.nodes[node];

      if (!d.hasOwnProperty("name"))
        continue;

      if (!data.stations.hasOwnProperty(d.name))
        throw new Error("Cannot find station with key: " + d.name);

      var station = data.stations[d.name];

      station.x = d.coords[0];
      station.y = d.coords[1];

      if (station.labelPos === undefined) {
        station.labelPos = d.labelPos;
        station.labelShiftX = d.hasOwnProperty("shiftCoords") ? d.shiftCoords[0] : line.shiftCoords[0];
        station.labelShiftY = d.hasOwnProperty("shiftCoords") ? d.shiftCoords[1] : line.shiftCoords[1];
      }

      if (d.hasOwnProperty("canonical")) {
        station.labelShiftX = d.hasOwnProperty("shiftCoords") ? d.shiftCoords[0] : line.shiftCoords[0];
        station.labelShiftY = d.hasOwnProperty("shiftCoords") ? d.shiftCoords[1] : line.shiftCoords[1];
        station.labelPos = d.labelPos;
      }

      station.label = data.stations[d.name].title;
      station.position = data.stations[d.name].position;
      station.visited = false;

      if (!d.hide) {

        station.marker = station.marker || [];

        station.marker.push(
          {
            "line": line.name,
            "color": line.color,
            "labelPos": d.labelPos,
            "marker": (d.hasOwnProperty("marker")) ? d.marker : "station",
            "shiftX": d.hasOwnProperty("shiftCoords") ? d.shiftCoords[0] : line.shiftCoords[0],
            "shiftY": d.hasOwnProperty("shiftCoords") ? d.shiftCoords[1] : line.shiftCoords[1]
          }
        );
      }
    }
  });

  return new Stations(data.stations);
}

function extractLines(data) {
  var lines = [];

  data.forEach(function (line) {

    var lineObj = {
      "name": line.name,
      "title": line.label,
      "stations": [],
      "color": line.color,
      "shiftCoords": line.shiftCoords,
      "nodes": line.nodes,
      "highlighted": false
    };

    lines.push(lineObj);

    for (var node = 0; node < line.nodes.length; node++) {
      var data = line.nodes[node];

      if (!data.hasOwnProperty("name"))
        continue;

      lineObj.stations.push(data.name);
    }
  });

  return new Lines(lines);
}

var Stations = function (stations) {
  this.stations = stations;
};

Stations.prototype.toArray = function () {
  var stations = [];

  for (var name in this.stations) {
    if (this.stations.hasOwnProperty(name)) {
      var station = this.stations[name];
      station.name = name;
      stations.push(station);
    }
  }

  return stations;
};

Stations.prototype.interchanges = function () {
  var interchangeStations = this.toArray();

  return interchangeStations.filter(function (station) { return station.marker[0].marker === "interchange" });
};

Stations.prototype.normalStations = function () {
  var stations = this.toArray();

  var stationStations = stations.filter(function (station) { return station.marker[0].marker !== "interchange"; });

  var stationMarkers = [];

  stationStations.forEach(function (station) {
    station.marker.forEach(function (marker) {
      stationMarkers.push(
        {
          "name": station.name,
          "line": marker.line,
          "x": station.x,
          "y": station.y,
          "color": marker.color,
          "shiftX": marker.shiftX,
          "shiftY": marker.shiftY,
          "labelPos": station.labelPos
        }
      );
    });
  });

  return stationMarkers;
};

Stations.prototype.visited = function () {
  var visitedStations = this.toArray();

  return visitedStations.filter(function (station) { return station.visited; });
};

Stations.prototype.visitedFriendly = function () {
  var visitedStations = this.visited();

  return visitedStations.map(function (station) { return station.title; });
};

Stations.prototype.isVisited = function (name) {
  return this.stations[name].visited;
};

var Lines = function (lines) {
  this.lines = lines;
};

Lines.prototype.highlightLine = function (name) {
  this.lines.forEach(function (line) {
    if (line.name === name) {
      line.highlighted = true;
    }
  });
};

Lines.prototype.unhighlightLine = function (name) {
  this.lines.forEach(function (line) {
    if (line.name === name) {
      line.highlighted = false;
    }
  });
};

function drawLine(data, xScale, yScale, lineWidth) {
  var path = "";

  var lineNodes = data.nodes;

  var unitLength = xScale(1) - xScale(0);

  var shiftCoords = [data.shiftCoords[0] * lineWidth / unitLength, data.shiftCoords[1] * lineWidth / unitLength];

  var lastSectionType = "diagonal"; // TODO: HACK

  var nextNode, currNode, xDiff, yDiff;
  var points;

  for (var lineNode = 0; lineNode < lineNodes.length; lineNode++) {
    if (lineNode > 0) {
      nextNode = lineNodes[lineNode];
      currNode = lineNodes[lineNode - 1];

      var direction = "";

      xDiff = Math.round(currNode.coords[0] - nextNode.coords[0]);
      yDiff = Math.round(currNode.coords[1] - nextNode.coords[1]);

      var lineEndCorrection = [0, 0];

      if (lineNode === lineNodes.length - 1) {
        if ((xDiff == 0) || (yDiff == 0)) {
          if (xDiff > 0)
            lineEndCorrection = [-lineWidth / (4 * unitLength), 0];
          if (xDiff < 0)
            lineEndCorrection = [lineWidth / (4 * unitLength), 0];
          if (yDiff > 0)
            lineEndCorrection = [0, -lineWidth / (4 * unitLength)];
          if (yDiff < 0)
            lineEndCorrection = [0, lineWidth / (4 * unitLength)];
        } else {
          var sqrt2 = Math.sqrt(2);

          if ((xDiff > 0) && (yDiff > 0))
            lineEndCorrection = [-lineWidth / (4 * unitLength * sqrt2), -lineWidth / (4 * unitLength * sqrt2)];
          if ((xDiff > 0) && (yDiff < 0))
            lineEndCorrection = [-lineWidth / (4 * unitLength * sqrt2), lineWidth / (4 * unitLength * sqrt2)];
          if ((xDiff < 0) && (yDiff > 0))
            lineEndCorrection = [lineWidth / (4 * unitLength * sqrt2), -lineWidth / (4 * unitLength * sqrt2)];
          if ((xDiff < 0) && (yDiff < 0))
            lineEndCorrection = [lineWidth / (4 * unitLength * sqrt2), lineWidth / (4 * unitLength * sqrt2)];
        }
      }

      points = [
        [
          xScale(currNode.coords[0] + shiftCoords[0]),
          yScale(currNode.coords[1] + shiftCoords[1])
        ],
        [
          xScale(nextNode.coords[0] + shiftCoords[0] + lineEndCorrection[0]),
          yScale(nextNode.coords[1] + shiftCoords[1] + lineEndCorrection[1])
        ]
      ];

      if ((xDiff == 0) || (yDiff == 0)) {
        lastSectionType = "udlr";
        path += "L" + points[1][0] + "," + points[1][1];
      } else if ((Math.abs(xDiff) == Math.abs(yDiff)) && (Math.abs(xDiff) > 1)) {
        lastSectionType = "diagonal";
        path += "L" + points[1][0] + "," + points[1][1];
      }
      else if ((Math.abs(xDiff) == 1) && (Math.abs(yDiff) == 1)) {
        direction = nextNode.dir.toLowerCase();

        switch (direction) {
          case "e":
            path += "Q" + points[1][0] + "," + points[0][1] + "," + points[1][0] + "," + points[1][1];
            break;
          case "s":
            path += "Q" + points[0][0] + "," + points[1][1] + "," + points[1][0] + "," + points[1][1];
            break;
          case "n":
            path += "Q" + points[0][0] + "," + points[1][1] + "," + points[1][0] + "," + points[1][1];
            break;
          case "w":
            path += "Q" + points[1][0] + "," + points[0][1] + "," + points[1][0] + "," + points[1][1];
            break;
        }
      }
      else if (((Math.abs(xDiff) == 1) && (Math.abs(yDiff) == 2)) || ((Math.abs(xDiff) == 2) && (Math.abs(yDiff) == 1))) {
        var controlPoints;
        if (xDiff == 1) {
          if (lastSectionType == "udlr") {
            controlPoints = [
              points[0][0],
              points[0][1] + (points[1][1] - points[0][1]) / 2
            ];
          } else if (lastSectionType == "diagonal") {
            controlPoints = [
              points[1][0],
              points[0][1] + (points[1][1] - points[0][1]) / 2
            ];
          }
        } else if (xDiff == -1) {
          if (lastSectionType == "udlr") {
            controlPoints = [
              points[0][0],
              points[0][1] + (points[1][1] - points[0][1]) / 2
            ];
          } else if (lastSectionType == "diagonal") {
            controlPoints = [
              points[1][0],
              points[0][1] + (points[1][1] - points[0][1]) / 2
            ];
          }
        } else if (xDiff == -2) {
          if (lastSectionType == "udlr") {
            controlPoints = [
              points[0][0] + (points[1][0] - points[0][0]) / 2,
              points[0][1]
            ];
          } else if (lastSectionType == "diagonal") {
            controlPoints = [
              points[0][0] + (points[1][0] - points[0][0]) / 2,
              points[1][1]
            ];
          }
        } else if (xDiff == 2) {
          if (lastSectionType == "udlr") {
            controlPoints = [
              points[0][0] + (points[1][0] - points[0][0]) / 2,
              points[0][1]
            ];
          } else if (lastSectionType == "diagonal") {
            controlPoints = [
              points[0][0] + (points[1][0] - points[0][0]) / 2,
              points[1][1]
            ];
          }
        }

        path += "C" + controlPoints[0] + "," + controlPoints[1] + "," + controlPoints[0] + "," + controlPoints[1] + "," + points[1][0] + "," + points[1][1];
      }
    } else {
      nextNode = lineNodes[lineNode + 1];
      currNode = lineNodes[lineNode];

      xDiff = Math.round(currNode.coords[0] - nextNode.coords[0]);
      yDiff = Math.round(currNode.coords[1] - nextNode.coords[1]);

      var lineStartCorrection = [0, 0];

      if ((xDiff == 0) || (yDiff == 0)) {
        if (xDiff > 0)
          lineStartCorrection = [lineWidth / (4 * unitLength), 0];
        if (xDiff < 0)
          lineStartCorrection = [-lineWidth / (4 * unitLength), 0];
        if (yDiff > 0)
          lineStartCorrection = [0, lineWidth / (4 * unitLength)];
        if (yDiff < 0)
          lineStartCorrection = [0, -lineWidth / (4 * unitLength)];
      } else {
        var sqrt2 = Math.sqrt(2);
        if ((xDiff > 0) && (yDiff > 0))
          lineStartCorrection = [lineWidth / (4 * unitLength * sqrt2), lineWidth / (4 * unitLength * sqrt2)];
        if ((xDiff > 0) && (yDiff < 0))
          lineStartCorrection = [lineWidth / (4 * unitLength * sqrt2), -lineWidth / (4 * unitLength * sqrt2)];
        if ((xDiff < 0) && (yDiff > 0))
          lineStartCorrection = [-lineWidth / (4 * unitLength * sqrt2), lineWidth / (4 * unitLength * sqrt2)];
        if ((xDiff < 0) && (yDiff < 0))
          lineStartCorrection = [-lineWidth / (4 * unitLength * sqrt2), -lineWidth / (4 * unitLength * sqrt2)];
      }

      points = [
        xScale(currNode.coords[0] + shiftCoords[0] + lineStartCorrection[0]),
        yScale(currNode.coords[1] + shiftCoords[1] + lineStartCorrection[1])
      ];

      path += "M" + points[0] + "," + points[1];
    }
  }

  return path;
}