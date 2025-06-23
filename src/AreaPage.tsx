import React, { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM } from "ol/source";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat, transformExtent } from "ol/proj";
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from "ol/style";
import "ol/ol.css";

/**
 * DataItem describes a single row/item for map marker and area data display.
 */
type DataItem = {
  stn: string;
  bearing: number;
  range: number;
  latitude: number;
  longitude: number;
  category: string;
  generalType: string;
  timestamp: string;
};

const DEFAULT_CENTER: [number, number] = [107, -6];

const WORLD_EXTENT_LONLAT = [-180, -85, 180, 85];
const WORLD_EXTENT_MERC = transformExtent(WORLD_EXTENT_LONLAT, "EPSG:4326", "EPSG:3857");
const AreaPage: React.FC<{ worker: Worker }> = ({ worker }) => {
  const [areaData, setAreaData] = useState<DataItem[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const olMapRef = useRef<Map>();
  const vectorLayerRef = useRef<VectorLayer<VectorSource>>();

  // === Listen to worker for area data ===
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data.mode === "area" && Array.isArray(e.data.areaData)) {
        setAreaData(e.data.areaData);
      }
    };
    worker.addEventListener("message", handler);
    // Kirim area full pertama kali, supaya map tidak kosong
    worker.postMessage({
      type: "getAreaData",
      area: {
        minLat: -90,
        maxLat: 90,
        minLon: -180,
        maxLon: 180,
      },
    });
    return () => worker.removeEventListener("message", handler);
  }, [worker]);

  // === Inisialisasi Map & Marker Layer sekali saja ===
  useEffect(() => {
    if (mapRef.current && !olMapRef.current) {
      // Source & Layer untuk marker
      const vectorSource = new VectorSource();
      const vectorLayer = new VectorLayer({
        source: vectorSource,
        updateWhileAnimating: true,
        updateWhileInteracting: true,
        style: (feature) =>
          new Style({
            image: new CircleStyle({
              radius: 6,
              fill: new Fill({ color: "#2979ff" }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
            text: new Text({
              text: String(feature.get("stn") ?? ""),
              offsetY: -16, // Supaya text tidak menimpa marker (atas marker)
              font: "bold 12px sans-serif",
              fill: new Fill({ color: "#1e293b" }), // Text dark
              stroke: new Stroke({ color: "#fff", width: 3 }), // Outline putih
              padding: [2, 4, 2, 4],
            }),
          }),
      });
      vectorLayerRef.current = vectorLayer;

      // Inisialisasi map
      const map = new Map({
        target: mapRef.current,
        layers: [new TileLayer({ source: new OSM() }), vectorLayer],
        view: new View({
          center: fromLonLat(DEFAULT_CENTER),
          zoom: 2,
          minZoom: 3,
          maxZoom: 10,
          extent: WORLD_EXTENT_MERC, // Set batas extent ke satu duniaa
        }),
      });
      olMapRef.current = map;
    }
  }, []);

  // === Update marker pada map setiap areaData berubah ===
  useEffect(() => {
    if (vectorLayerRef.current) {
      const vectorSource = vectorLayerRef.current.getSource();
      vectorSource?.clear();
      areaData.forEach((item) => {
        if (typeof item.longitude === "number" && typeof item.latitude === "number") {
          const feature = new Feature({
            geometry: new Point(fromLonLat([item.longitude, item.latitude])),
            ...item,
          });
          vectorSource?.addFeature(feature);
        }
      });
    }
  }, [areaData]);

  // === Trigger worker getAreaData setiap map view berubah ===
  // useEffect(() => {
  //   const map = olMapRef.current;
  //   if (!map) return;
  //   const onMoveEnd = () => {
  //     const view = map.getView();
  //     const extent = view.calculateExtent(map.getSize());
  //     const [minX, minY, maxX, maxY] = extent;
  //     const [minLon, minLat] = toLonLat([minX, minY]);
  //     const [maxLon, maxLat] = toLonLat([maxX, maxY]);
  //     worker.postMessage({
  //       type: "getAreaData",
  //       area: {
  //         minLat: Math.min(minLat, maxLat),
  //         maxLat: Math.max(minLat, maxLat),
  //         minLon: Math.min(minLon, maxLon),
  //         maxLon: Math.max(minLon, maxLon),
  //       },
  //     });
  //   };
  //   map.on("moveend", onMoveEnd);
  //   // Jalankan sekali supaya langsung filter sesuai view awal
  //   setTimeout(onMoveEnd, 100);
  //   return () => {
  //     map.un("moveend", onMoveEnd);
  //   };
  // }, [worker]);

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <h2 className="text-2xl font-bold mb-4">Data In Map View (Realtime Area - OpenLayers)</h2>
      <div className="mb-2 text-gray-700 text-sm">
        Total: <span className="font-semibold">{areaData.length}</span> record(s) in this view
      </div>
      <div
        ref={mapRef}
        className="rounded-xl shadow-lg border border-gray-200 bg-white"
        style={{ width: "100%", height: "480px", minHeight: 300 }}
      ></div>
    </div>
  );
};

export default AreaPage;
