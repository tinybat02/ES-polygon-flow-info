import React, { PureComponent } from 'react';
import { PanelProps } from '@grafana/data';
import { PanelOptions, Frame } from 'types';
import { Map, View } from 'ol';
import XYZ from 'ol/source/XYZ';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { fromLonLat } from 'ol/proj';
import { defaults, DragPan, MouseWheelZoom } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import Select from 'ol/interaction/Select';
import { Style, Text, Stroke, Fill } from 'ol/style';
import { pointerMove } from 'ol/events/condition';
import { SelectEvent } from 'ol/interaction/Select';
import { createHeatLayer, processTransitionData, createInfoLayer } from './utils/helpers';
import { nanoid } from 'nanoid';
import 'ol/ol.css';

interface Props extends PanelProps<PanelOptions> {}
interface State {
  currentPolygon: string | null;
}

export class MainPanel extends PureComponent<Props, State> {
  id = 'id' + nanoid();
  map1: Map;
  map2: Map;
  randomTile1: TileLayer;
  randomTile2: TileLayer;
  heatLayer1: VectorLayer;
  heatLayer2: VectorLayer;
  infoMap1: VectorLayer;
  infoMap2: VectorLayer;
  startObj: { [key: string]: { [key: string]: number } };
  destObj: { [key: string]: { [key: string]: number } };

  state: State = {
    currentPolygon: null,
  };

  componentDidMount() {
    const { tile_url1, tile_url2, zoom_level, center_lon, center_lat, geojson1, geojson2 } = this.props.options;

    const carto1 = new TileLayer({
      source: new XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      }),
    });
    const carto2 = new TileLayer({
      source: new XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      }),
    });

    this.map1 = new Map({
      interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
        new DragPan({
          condition: function(event) {
            return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
          },
        }),
        new MouseWheelZoom({
          condition: platformModifierKeyOnly,
        }),
      ]),
      layers: [carto1],
      view: new View({
        center: fromLonLat([center_lon, center_lat]),
        zoom: zoom_level,
      }),
      target: this.id + '1',
    });

    this.map2 = new Map({
      interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
        new DragPan({
          condition: function(event) {
            return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
          },
        }),
        new MouseWheelZoom({
          condition: platformModifierKeyOnly,
        }),
      ]),
      layers: [carto2],
      view: new View({
        center: fromLonLat([center_lon, center_lat]),
        zoom: zoom_level,
      }),
      target: this.id + '2',
    });

    if (tile_url1 !== '') {
      this.randomTile1 = new TileLayer({
        source: new XYZ({
          url: tile_url1,
        }),
        zIndex: 1,
      });
      this.map1.addLayer(this.randomTile1);
    }

    if (tile_url2 !== '') {
      this.randomTile2 = new TileLayer({
        source: new XYZ({
          url: tile_url2,
        }),
        zIndex: 1,
      });
      this.map2.addLayer(this.randomTile2);
    }

    if (this.props.data.series.length > 1 && geojson1 && geojson2) {
      const heatData: Frame[] = [];
      const transitionData: Frame[] = [];
      this.props.data.series.map(serie => {
        if (serie.name !== 'docs') {
          heatData.push(serie as Frame);
        } else {
          transitionData.push(serie as Frame);
        }
      });

      const { heatLayer1, heatLayer2 } = createHeatLayer(heatData, geojson1, geojson2);
      this.heatLayer1 = heatLayer1;
      this.heatLayer2 = heatLayer2;
      this.map1.addLayer(this.heatLayer1);
      this.map2.addLayer(this.heatLayer2);

      if (transitionData.length > 0 && transitionData[0].fields[0].values.buffer.length > 0) {
        const { startObj, destObj } = processTransitionData(transitionData[0].fields[0].values.buffer);
        this.startObj = startObj;
        this.destObj = destObj;
      }

      const hoverInteraction1 = new Select({
        condition: pointerMove,
        style: function(feature) {
          const style: { [key: string]: any[] } = {};
          const geometry_type = feature.getGeometry().getType();

          style['Polygon'] = [
            new Style({
              fill: new Fill({
                color: feature.get('color'),
              }),
            }),
            new Style({
              text: new Text({
                stroke: new Stroke({
                  color: '#fff',
                  width: 2,
                }),
                font: '18px Calibri,sans-serif',
                text: feature.get('value'),
              }),
            }),
          ];

          return style[geometry_type];
        },
      });

      const hoverInteraction2 = new Select({
        condition: pointerMove,
        style: function(feature) {
          const style: { [key: string]: any[] } = {};
          const geometry_type = feature.getGeometry().getType();

          style['Polygon'] = [
            new Style({
              fill: new Fill({
                color: feature.get('color'),
              }),
            }),
            new Style({
              text: new Text({
                stroke: new Stroke({
                  color: '#fff',
                  width: 2,
                }),
                font: '18px Calibri,sans-serif',
                text: feature.get('value'),
              }),
            }),
          ];

          return style[geometry_type];
        },
      });

      hoverInteraction1.on('select', (e: SelectEvent) => {
        const selectedFeature = e.target.getFeatures().item(0);

        if (selectedFeature) {
          if (selectedFeature.get('label') !== this.state.currentPolygon) {
            this.setState({ currentPolygon: selectedFeature.get('label') });
          }
        } else {
          this.setState({ currentPolygon: null });
        }
      });

      hoverInteraction2.on('select', (e: SelectEvent) => {
        const selectedFeature = e.target.getFeatures().item(0);

        if (selectedFeature) {
          if (selectedFeature.get('label') !== this.state.currentPolygon) {
            this.setState({ currentPolygon: selectedFeature.get('label') });
          }
        } else {
          this.setState({ currentPolygon: null });
        }
      });

      this.map1.addInteraction(hoverInteraction1);
      this.map2.addInteraction(hoverInteraction2);
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.data.series !== this.props.data.series) {
      if (this.props.options.geojson1 && this.props.options.geojson2) {
        this.map1.removeLayer(this.heatLayer1);
        this.map2.removeLayer(this.heatLayer2);
        this.map1.removeLayer(this.infoMap1);
        this.map1.removeLayer(this.infoMap2);

        const heatData: Frame[] = [];
        const transitionData: Frame[] = [];
        this.props.data.series.map(serie => {
          if (serie.name !== 'docs') {
            heatData.push(serie as Frame);
          } else {
            transitionData.push(serie as Frame);
          }
        });
        const { heatLayer1, heatLayer2 } = createHeatLayer(
          heatData,
          this.props.options.geojson1,
          this.props.options.geojson2
        );
        this.heatLayer1 = heatLayer1;
        this.heatLayer2 = heatLayer2;
        this.map1.addLayer(this.heatLayer1);
        this.map2.addLayer(this.heatLayer2);

        if (transitionData.length > 0 && transitionData[0].fields[0].values.buffer.length > 0) {
          const { startObj, destObj } = processTransitionData(transitionData[0].fields[0].values.buffer);
          this.startObj = startObj;
          this.destObj = destObj;
        }
      }
    }

    if (prevProps.options.tile_url1 !== this.props.options.tile_url1) {
      this.map1.removeLayer(this.randomTile1);
      if (this.props.options.tile_url1 !== '') {
        this.randomTile1 = new TileLayer({
          source: new XYZ({
            url: this.props.options.tile_url1,
          }),
          zIndex: 1,
        });
        this.map1.addLayer(this.randomTile1);
      }
    }

    if (prevProps.options.tile_url2 !== this.props.options.tile_url2) {
      this.map2.removeLayer(this.randomTile2);
      if (this.props.options.tile_url2 !== '') {
        this.randomTile2 = new TileLayer({
          source: new XYZ({
            url: this.props.options.tile_url2,
          }),
          zIndex: 1,
        });
        this.map2.addLayer(this.randomTile2);
      }
    }

    if (prevProps.options.zoom_level !== this.props.options.zoom_level) {
      this.map1.getView().setZoom(this.props.options.zoom_level);
      this.map2.getView().setZoom(this.props.options.zoom_level);
    }

    if (
      prevProps.options.center_lat !== this.props.options.center_lat ||
      prevProps.options.center_lon !== this.props.options.center_lon
    ) {
      this.map1.getView().animate({
        center: fromLonLat([this.props.options.center_lon, this.props.options.center_lat]),
        duration: 2000,
      });
      this.map2.getView().animate({
        center: fromLonLat([this.props.options.center_lon, this.props.options.center_lat]),
        duration: 2000,
      });
    }

    if (prevState.currentPolygon !== this.state.currentPolygon) {
      if (!this.state.currentPolygon) {
        this.map1.removeLayer(this.infoMap1);
        this.map2.removeLayer(this.infoMap2);
      }
    }

    if (prevState.currentPolygon !== this.state.currentPolygon) {
      if (!this.state.currentPolygon) {
        this.map1.removeLayer(this.infoMap1);
        this.map1.removeLayer(this.infoMap1);
      }
    }

    if (
      this.props.options.geojson1 &&
      this.props.options.geojson2 &&
      this.state.currentPolygon &&
      prevState.currentPolygon !== this.state.currentPolygon
    ) {
      this.map1.removeLayer(this.infoMap1);
      this.map2.removeLayer(this.infoMap2);
      const currentStore = this.state.currentPolygon;

      if (this.startObj[currentStore] || this.destObj[currentStore]) {
        const { infoMap1, infoMap2 } = createInfoLayer(
          this.props.options.geojson1,
          this.props.options.geojson2,
          this.startObj[currentStore],
          this.destObj[currentStore]
        );
        this.infoMap1 = infoMap1;
        this.infoMap2 = infoMap2;

        this.map1.addLayer(this.infoMap1);
        this.map2.addLayer(this.infoMap2);
      }
    }
  }

  render() {
    const { width, height } = this.props;

    return (
      <div style={{ display: 'flex' }}>
        <div id={this.id + '1'} style={{ width: width / 2, height }}></div>
        <div id={this.id + '2'} style={{ width: width / 2, height }}></div>
      </div>
    );
  }
}
