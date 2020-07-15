import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { Style, Fill, Stroke, Text } from 'ol/style';
// import { getCenter } from 'ol/extent';
import { Frame, GeoJSON, FeatureGeojson } from '../types';
import centroid from '@turf/centroid';
import Point from 'ol/geom/Point';
// import Point from 'ol/geom/Point';

const percentageToHsl = (percentage: number) => {
  const hue = percentage * -120 + 120;
  return 'hsla(' + hue + ', 100%, 50%, 0.3)';
};

const createPolygon = (coordinates: number[][][], value: string, label: string, color: string) => {
  const polygonFeature = new Feature({
    type: 'Polygon',
    geometry: new Polygon(coordinates).transform('EPSG:4326', 'EPSG:3857'),
  });
  polygonFeature.set('value', value);
  polygonFeature.set('label', label);
  polygonFeature.set('color', color);
  polygonFeature.setStyle(
    new Style({
      fill: new Fill({
        color: color,
      }),
    })
  );
  return polygonFeature;
};

export const createInfo = (/* coordinates: number[][][], */ feature: FeatureGeojson, label: string) => {
  const centerCoord = centroid.default(feature).geometry.coordinates;
  const pointFeature = new Feature({
    type: 'Point',
    geometry: new Point(centerCoord).transform('EPSG:4326', 'EPSG:3857'),
  });
  pointFeature.setStyle(
    new Style({
      text: new Text({
        stroke: new Stroke({
          color: '#fff',
          width: 3,
        }),
        font: '15px Calibri,sans-serif',
        text: label,
      }),
    })
  );
  return pointFeature;
  // const polygonFeature = new Feature({
  //   type: 'Polygon',
  //   geometry: new Polygon(coordinates).transform('EPSG:4326', 'EPSG:3857'),
  // });
  // polygonFeature.setStyle(
  //   new Style({
  //     text: new Text({
  //       stroke: new Stroke({
  //         color: '#fff',
  //         width: 3,
  //       }),
  //       font: '15px Calibri,sans-serif',
  //       text: label,
  //     }),
  //   })
  // );
  // return polygonFeature;
  // ############################
  // const polygonFeature = new Polygon(coordinates).transform('EPSG:4326', 'EPSG:3857');
  // const extent = polygonFeature.getExtent();
  // const centroid = getCenter(extent);
  // const pointFeature = new Feature({
  //   type: 'Point',
  //   geometry: new Point(centroid),
  // });
  // pointFeature.setStyle(
  //   new Style({
  //     text: new Text({
  //       stroke: new Stroke({
  //         color: '#fff',
  //         width: 3,
  //       }),
  //       font: '15px Calibri,sans-serif',
  //       text: label,
  //     }),
  //   })
  // );
  // return pointFeature;
};

export const createHeatLayer = (series: Frame[], geojson1: GeoJSON, geojson2: GeoJSON) => {
  const stores: string[] = [];
  const assignValueToStore: { [key: string]: number } = {};
  const assignValueToStoreLog: { [key: string]: number } = {};

  series.map(item => {
    const sumValue = item.fields[0].values.buffer.reduce((sum, elm) => sum + elm, 0);
    if (item.name) {
      stores.push(item.name);
      assignValueToStore[item.name] = sumValue;
      assignValueToStoreLog[item.name] = Math.log2(sumValue);
    }
  });

  const heatValues = Object.values(assignValueToStoreLog);
  const max = Math.max(...heatValues);
  const min = Math.min(...heatValues);
  const range = max - min;

  const polygons1: Feature[] = [];
  const polygons2: Feature[] = [];

  geojson1.features.map(feature => {
    if (feature.properties && feature.properties.name && stores.includes(feature.properties.name)) {
      const percentage = (assignValueToStoreLog[feature.properties.name] - min) / range;
      polygons1.push(
        createPolygon(
          feature.geometry.coordinates,
          assignValueToStore[feature.properties.name].toString(),
          feature.properties.name,
          percentageToHsl(percentage)
        )
      );
    }
  });

  geojson2.features.map(feature => {
    if (feature.properties && feature.properties.name && stores.includes(feature.properties.name)) {
      const percentage = (assignValueToStoreLog[feature.properties.name] - min) / range;
      polygons2.push(
        createPolygon(
          feature.geometry.coordinates,
          assignValueToStore[feature.properties.name].toString(),
          feature.properties.name,
          percentageToHsl(percentage)
        )
      );
    }
  });

  return {
    heatLayer1: new VectorLayer({
      source: new VectorSource({
        features: polygons1,
      }),
      zIndex: 2,
    }),
    heatLayer2: new VectorLayer({
      source: new VectorSource({
        features: polygons2,
      }),
      zIndex: 2,
    }),
  };
};

export const createInfoLayer = (
  geojson1: GeoJSON,
  geojson2: GeoJSON,
  startObj: { [key: string]: number } | undefined,
  destObj: { [key: string]: number } | undefined
) => {
  const infoMap1Feature: Feature[] = [];
  const infoMap2Feature: Feature[] = [];
  if (startObj && !destObj) {
    const listDestinations = Object.keys(startObj);
    geojson1.features.map(feature => {
      if (feature.properties && feature.properties.name && listDestinations.includes(feature.properties.name)) {
        // infoMap1Feature.push(createInfo(feature.geometry.coordinates, `To ${startObj[feature.properties.name]}`));
        infoMap1Feature.push(createInfo(feature, `To ${startObj[feature.properties.name]}`));
      }
    });
    geojson2.features.map(feature => {
      if (feature.properties && feature.properties.name && listDestinations.includes(feature.properties.name)) {
        // infoMap2Feature.push(createInfo(feature.geometry.coordinates, `To ${startObj[feature.properties.name]}`));
        infoMap2Feature.push(createInfo(feature, `To ${startObj[feature.properties.name]}`));
      }
    });
  } else if (!startObj && destObj) {
    const listSources = Object.keys(destObj);

    geojson1.features.map(feature => {
      if (feature.properties && feature.properties.name && listSources.includes(feature.properties.name)) {
        // infoMap1Feature.push(createInfo(feature.geometry.coordinates, `From ${destObj[feature.properties.name]}`));
        infoMap1Feature.push(createInfo(feature, `From ${destObj[feature.properties.name]}`));
      }
    });
    geojson2.features.map(feature => {
      if (feature.properties && feature.properties.name && listSources.includes(feature.properties.name)) {
        // infoMap2Feature.push(createInfo(feature.geometry.coordinates, `From ${destObj[feature.properties.name]}`));
        infoMap2Feature.push(createInfo(feature, `From ${destObj[feature.properties.name]}`));
      }
    });
  } else if (startObj && destObj) {
    const listDestinations = Object.keys(startObj);
    const listSources = Object.keys(destObj);
    const allRelatedStores = [...new Set([...listDestinations, ...listSources])];

    geojson1.features.map(feature => {
      if (feature.properties && feature.properties.name && allRelatedStores.includes(feature.properties.name)) {
        const label =
          `${startObj[feature.properties.name] ? `To ${startObj[feature.properties.name]}` : ''}` +
          `${destObj[feature.properties.name] ? ` From ${destObj[feature.properties.name]}` : ''}`;
        console.log('ground floor ', feature.properties.name, label);
        // infoMap1Feature.push(createInfo(feature.geometry.coordinates, label));
        infoMap1Feature.push(createInfo(feature, label));
      }
    });

    geojson2.features.map(feature => {
      if (feature.properties && feature.properties.name && allRelatedStores.includes(feature.properties.name)) {
        const label =
          `${startObj[feature.properties.name] ? `To ${startObj[feature.properties.name]}` : ''}` +
          `${destObj[feature.properties.name] ? ` From ${destObj[feature.properties.name]}` : ''}`;

        // infoMap2Feature.push(createInfo(feature.geometry.coordinates, label));
        infoMap2Feature.push(createInfo(feature, label));
      }
    });
  }
  console.log('infoMap1Feature ', infoMap1Feature);
  console.log('infoMap2Feature ', infoMap2Feature);
  return {
    infoMap1: new VectorLayer({
      source: new VectorSource({
        features: infoMap1Feature,
      }),
      zIndex: 3,
    }),
    infoMap2: new VectorLayer({
      source: new VectorSource({
        features: infoMap2Feature,
      }),
      zIndex: 3,
    }),
  };
};

export const processTransitionData = (data: any[]) => {
  const excludeArr = ['_id', '_index', '_type', 'Source', 'timestamp'];
  const startObj: { [key: string]: { [key: string]: number } } = {};
  const destObj: { [key: string]: { [key: string]: number } } = {};

  data.map(row => {
    if (!startObj[row.Source]) startObj[row.Source] = {};

    Object.keys(row).map(destination => {
      if (!excludeArr.includes(destination) && row[destination] > 0) {
        startObj[row.Source][destination]
          ? (startObj[row.Source][destination] += row[destination])
          : (startObj[row.Source][destination] = row[destination]);

        if (!destObj[destination]) destObj[destination] = {};

        destObj[destination][row.Source]
          ? (destObj[destination][row.Source] += row[destination])
          : (destObj[destination][row.Source] = row[destination]);
      }
    });
  });

  Object.keys(startObj).map(start => {
    if (Object.keys(start).length == 0) delete startObj[start];
  });

  return { startObj, destObj };
};
