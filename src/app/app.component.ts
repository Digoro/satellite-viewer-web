import { ViewChild, Component, ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Cartesian3, Math, ImageryLayer, Rectangle, SingleTileImageryProvider, Viewer, HeadingPitchRoll, Transforms, Color, PolylineGlowMaterialProperty, TimeIntervalCollection, TimeInterval, VelocityOrientationProperty, SampledPositionProperty, JulianDate, Entity, CallbackProperty } from 'cesium';
import { Orbit } from './orbit';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
  @ViewChild('cesiumContainer') cesiumContainer: ElementRef;
  viewer: Viewer;
  satellite: Entity;
  position: SampledPositionProperty;
  isInitial = false;

  constructor() { }

  ngAfterViewInit(): void {
    this.initViewer();
    this.initGroundSystem();
    this.initSatellite();

    const socket = new WebSocket('ws://localhost:3000');
    socket.onmessage = (event) => {
      const orbit: Orbit = JSON.parse(event.data);
      if (!this.isInitial) this.initTime(orbit);
      this.updateOrbit(orbit);
    }
  }

  updateOrbit(orbit: Orbit) {
    let date = new Date(orbit.time);
    let copiedDate = new Date(date.getTime());
    copiedDate.setHours(copiedDate.getHours() + 9);
    const dateTime = JulianDate.fromDate(copiedDate);
    const position = Cartesian3.fromDegrees(orbit.lon, orbit.lat, orbit.alt * 1000);
    this.position.addSample(dateTime, position);
  }

  initTime(orbit: Orbit) {
    let date = new Date(orbit.time);
    let copiedDate = new Date(date.getTime());
    copiedDate.setHours(copiedDate.getHours() + 9);
    const dateTime = JulianDate.fromDate(copiedDate);
    this.viewer.clock.currentTime = dateTime.clone();
    this.isInitial = true;
  }

  initViewer() {
    this.viewer = new Viewer(this.cesiumContainer.nativeElement, {
      baseLayer: ImageryLayer.fromProviderAsync(
        SingleTileImageryProvider.fromUrl(
          '/assets/earth.jpg', {
        }), {}
      ),
    });
  }

  initGroundSystem() {
    const position = Cartesian3.fromDegrees(127.367, 36.394, 500);
    const hpr = new HeadingPitchRoll(Math.toRadians(-90), Math.toRadians(40), Math.toRadians(40));
    const orientation = Transforms.headingPitchRollQuaternion(position, hpr);
    this.viewer.entities.add({
      name: 'ground system',
      position: position,
      orientation: orientation,
      model: {
        uri: '/assets/antenna.glb',
        minimumPixelSize: 100,
        maximumScale: 8000
      }
    });

    const center = Cartesian3.fromDegrees(127.367, 36.394);
    const radius = 1000000.0;
    this.viewer.entities.add({
      name: 'Circle Polygon',
      position: center,
      ellipse: {
        semiMinorAxis: radius,
        semiMajorAxis: radius,
        material: Color.BLUE.withAlpha(0.3),
        outline: true,
        outlineColor: Color.RED,
        outlineWidth: 20
      }
    });
  }

  initSatellite() {
    const displayStartTime = JulianDate.fromDate(new Date('1970-01-01'));
    const displayEndTime = JulianDate.fromDate(new Date('2300-01-01'));
    this.position = new SampledPositionProperty();
    this.satellite = this.viewer.entities.add({
      availability: new TimeIntervalCollection([new TimeInterval({
        start: displayStartTime,
        stop: displayEndTime
      })]),
      position: this.position,
      model: {
        uri: '/assets/satellite.glb',
        minimumPixelSize: 64,
        maximumScale: 50000,
        scale: 50000
      },
      path: {
        resolution: 1,
        material: new PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: Color.YELLOW
        }),
        width: 5
      }
    });
  }
}
