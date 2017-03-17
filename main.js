/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Animated,
  AppRegistry,
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';

export default class PubMap extends Component {
  constructor() {
    super(...arguments);
    this.state = {
      x: 0,
      y: 0,
      hover: false
    };

    this.state = {
      zoom: 8,
      minZoom: 1,
      maxZoom: 8,
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
      top: -300,
      left: -800,
      width: 375,
      height: 375
    }
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
    return (
      <View {...this._panResponder.panHandlers} style={styles.container}>
        <Image
          style={{
            marginLeft: this.state.left,
            marginTop: this.state.top,
            width: 300 * this.state.zoom,
            height: 200 * this.state.zoom
          }}
          source={require('./map.png')}
          />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: '#F5FCFF',
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

