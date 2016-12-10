export function mangleData(data) {
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

export function drawLine(data, xScale, yScale, lineWidth) {
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

export function textPos(data, lineWidth) {
    var pos;
    var textAnchor;
    var offset = lineWidth * 1.8;

    var numLines = data.label.split(/\n/).length;

    var sqrt2 = Math.sqrt(2);

    switch (data.labelPos.toLowerCase()) {
      case "n":
        pos = [0, lineWidth*(numLines - 1) + offset];
        textAnchor = "middle";
        break;
      case "ne":
        pos = [offset / sqrt2, (lineWidth*(numLines - 1) + offset) / sqrt2];
        textAnchor = "start";
        break;
      case "e":
        pos = [offset, 0];
        textAnchor = "start";
        break;
      case "se":
        pos = [offset / sqrt2, -offset / sqrt2];
        textAnchor = "start";
        break;
      case "s":
        pos = [0, -1.2*offset];
        textAnchor = "middle";
        break;
      case "sw":
        pos = [-offset/sqrt2, -1.4*offset/sqrt2];
        textAnchor = "end";
        break;
      case "w":
        pos = [-offset, 0];
        textAnchor = "end";
        break;
      case "nw":
        pos = [-(lineWidth*(numLines - 1) + offset)/sqrt2, (lineWidth*(numLines - 1) + offset)/sqrt2];
        textAnchor = "end";
        break;
      default:
        break;
    }

    return {
      "pos": pos,
      "textAnchor": textAnchor
    }
  }