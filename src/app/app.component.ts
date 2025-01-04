import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { Cartesian3, ClockViewModel, Color, Entity, HeadingPitchRoll, ImageryLayer, JulianDate, Math, PolylineGlowMaterialProperty, Quaternion, SampledPositionProperty, SampledProperty, SingleTileImageryProvider, TimeInterval, TimeIntervalCollection, Transforms, Viewer } from 'cesium';
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
  orientation: SampledProperty
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
      this.updateSatelliteAndOrbit(orbit);
    }
  }

  initViewer() {
    this.viewer = new Viewer(this.cesiumContainer.nativeElement, {
      baseLayer: ImageryLayer.fromProviderAsync(
        SingleTileImageryProvider.fromUrl(
          '/assets/earth.jpg', {
        }), {}
      ),
      clockViewModel: new ClockViewModel(),
    });
    // this.viewer.clock.multiplier = 10;
    this.viewer.clock.multiplier = 1;
    this.viewer.clock.shouldAnimate = true;
    this.viewer.clock.onTick.addEventListener(() => {
      this.satellite.path!.trailTime = new SampledProperty(JulianDate.secondsDifference(
        this.viewer.clock.currentTime, this.viewer.clock.startTime));
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
    const displayStartTime = JulianDate.fromIso8601('1970-01-01T00:00:00Z');
    const displayEndTime = JulianDate.fromIso8601('2300-01-01T00:00:00Z');
    this.position = new SampledPositionProperty();
    this.orientation = new SampledProperty(Quaternion);
    this.satellite = this.viewer.entities.add({
      availability: new TimeIntervalCollection([new TimeInterval({
        start: displayStartTime,
        stop: displayEndTime
      })]),
      position: this.position,
      orientation: this.orientation,
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
        width: 5,
        leadTime: 0,
        trailTime: 60
      },
    });
  }

  initTime(orbit: Orbit) {
    // const isoTimeString = orbit.time.replace(' ', 'T') + 'Z';
    const isoTime = JulianDate.fromIso8601(orbit.time);
    this.viewer.clock.currentTime = isoTime;
    this.isInitial = true;
  }

  updateSatelliteAndOrbit(orbit: Orbit) {
    // const isoTimeString = orbit.time.replace(' ', 'T') + 'Z';
    const isoTime = JulianDate.fromIso8601(orbit.time);
    const position = Cartesian3.fromDegrees(orbit.lon, orbit.lat, orbit.alt);
    // const hpr = new HeadingPitchRoll(Math.toRadians(orbit.roll), Math.toRadians(orbit.pitch), Math.toRadians(orbit.yaw));
    // const orientation = Transforms.headingPitchRollQuaternion(position, hpr);

    this.position.addSample(isoTime, position);
    // this.orientation.addSample(isoTime, orientation)

    // this.viewer.camera.flyTo({
    //   destination: Cartesian3.fromDegrees(orbit.lon, orbit.lat, 5000000),
    //   duration: 3.0,
    //   maximumHeight: 5000000,
    // })
  }
}
