import * as THREE from "three";

//
// globe
//

function createDepthFadeMaterial(maxOpacity, minOpacity) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uMaxOpacity: { value: maxOpacity },
            uMinOpacity: { value: minOpacity },
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPos.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,
        fragmentShader: `
            uniform float uMaxOpacity;
            uniform float uMinOpacity;
            varying vec3 vWorldPosition;
            void main() {
                vec3 normal = normalize(vWorldPosition);
                vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                float fade = smoothstep(-1.0, 1.0, dot(normal, viewDir));
                float opacity = mix(uMinOpacity, uMaxOpacity, fade);
                gl_FragColor = vec4(vec3(mix(0.3, 1.0, fade) * opacity), opacity);
            }
        `,
        transparent: true,
        depthWrite: false,
    });
}

function latLonToVec3(lat, lon) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
}

function buildBorderLines(geojson) {
    const material = createDepthFadeMaterial(0.85, 0.35);
    const group = new THREE.Group();

    for (const feature of geojson.features) {
        if (!feature.geometry) {
            continue;
        }

        const { type, coordinates } = feature.geometry;
        let rings = [];
        switch (type) {
            case "Polygon":
                rings = coordinates;
                break;
            case "MultiPolygon":
                rings = coordinates.flat();
                break;
            case "LineString":
                rings = [coordinates];
                break;
            case "MultiLineString":
                rings = coordinates;
                break;
            default:
                throw new Error(`unexpected geometry type: ${type}`);
        }

        for (const ring of rings) {
            const points = ring.map(([lon, lat]) => latLonToVec3(lat, lon));
            if (points.length < 2) {
                continue;
            }
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
        }
    }

    return group;
}

function buildGrid() {
    const material = createDepthFadeMaterial(0.1, 0.05);
    const group = new THREE.Group();

    for (let lat = -60; lat <= 60; lat += 30) {
        const points = [];
        for (let i = 0; i <= 120; i++) {
            points.push(latLonToVec3(lat, (i / 120) * 360 - 180));
        }
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    }

    for (let lon = -180; lon < 180; lon += 30) {
        const points = [];
        for (let i = 0; i <= 120; i++) {
            points.push(latLonToVec3((i / 120) * 180 - 90, lon));
        }
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    }

    return group;
}

function topoJsonToGeoJson(topology) {
    const objectName = Object.keys(topology.objects)[0];
    const topologyObject = topology.objects[objectName];
    const transform = topology.transform;

    function decodeArc(arcIndex) {
        const isReversed = arcIndex < 0;
        const arc = topology.arcs[isReversed ? ~arcIndex : arcIndex];
        const coordinates = [];
        let x = 0;
        let y = 0;

        for (const [dx, dy] of arc) {
            x += dx;
            y += dy;
            if (transform) {
                coordinates.push([x * transform.scale[0] + transform.translate[0], y * transform.scale[1] + transform.translate[1]]);
            } else {
                coordinates.push([x, y]);
            }
        }

        if (isReversed) {
            coordinates.reverse();
        }
        return coordinates;
    }

    function decodeRing(arcIndices) {
        let coordinates = [];
        for (const index of arcIndices) {
            const decoded = decodeArc(index);
            coordinates = coordinates.concat(coordinates.length > 0 ? decoded.slice(1) : decoded);
        }
        return coordinates;
    }

    const geometries = topologyObject.type === "GeometryCollection" ? topologyObject.geometries : [topologyObject];
    const features = [];

    const decodeCoordinates = {
        Polygon: (arcs) => arcs.map(decodeRing),
        MultiPolygon: (arcs) => arcs.map((p) => p.map(decodeRing)),
        LineString: (arcs) => decodeRing(arcs),
        MultiLineString: (arcs) => arcs.map(decodeRing),
    };

    for (const geom of geometries) {
        const decode = decodeCoordinates[geom.type];
        if (!decode) {
            continue;
        }
        const geometry = { type: geom.type, coordinates: decode(geom.arcs) };
        features.push({ type: "Feature", geometry, properties: geom.properties || {} });
    }

    return { type: "FeatureCollection", features };
}

//
// cities and flight arcs
//

const CITIES = [
    { name: "New York City", lat: 40.71, lon: -74.01 },
    { name: "San Francisco", lat: 37.77, lon: -122.42 },
    { name: "Chicago", lat: 41.88, lon: -87.63 },
    { name: "Hong Kong", lat: 22.32, lon: 114.17 },
    { name: "Singapore", lat: 1.35, lon: 103.82 },
    { name: "Zurich", lat: 47.38, lon: 8.54 },
    { name: "London", lat: 51.51, lon: -0.13 },
    // { name: "Amsterdam", lat: 52.37, lon: 4.9 },
    // { name: "Paris", lat: 48.86, lon: 2.35 },
    // { name: "Munich", lat: 48.14, lon: 11.58 },
    // { name: "Vienna", lat: 48.21, lon: 16.37 },
    { name: "Dubai", lat: 25.2, lon: 55.27 },
];

function buildCityDots() {
    const group = new THREE.Group();

    const dotGeom = new THREE.CircleGeometry(0.005, 16);
    const ringGeom = new THREE.RingGeometry(0.009, 0.011, 24);
    const markerMaterial = createDepthFadeMaterial(0.5, 0.1);
    markerMaterial.side = THREE.DoubleSide;

    for (const city of CITIES) {
        const pos = latLonToVec3(city.lat, city.lon);
        const outward = pos.clone().multiplyScalar(2);

        const dot = new THREE.Mesh(dotGeom, markerMaterial);
        dot.position.copy(pos);
        dot.lookAt(outward);
        group.add(dot);

        const ring = new THREE.Mesh(ringGeom, markerMaterial);
        ring.position.copy(pos);
        ring.lookAt(outward);
        group.add(ring);
    }

    return group;
}

function computeArcPoints(cityA, cityB, segments) {
    const start = latLonToVec3(cityA.lat, cityA.lon);
    const end = latLonToVec3(cityB.lat, cityB.lon);
    const maxElevation = start.distanceTo(end) * 0.1;

    const points = [];
    for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const point = new THREE.Vector3().copy(start).lerp(end, t).normalize();
        const elevation = Math.sin(t * Math.PI) * maxElevation;
        point.multiplyScalar(1.0 + elevation);
        points.push(point);
    }

    return points;
}

function getFlightRoutes() {
    const routes = [];
    for (let i = 0; i < CITIES.length; i++) {
        for (let j = i + 1; j < CITIES.length; j++) {
            if (Math.abs(CITIES[i].lon - CITIES[j].lon) > 160) {
                continue;
            }
            routes.push([CITIES[i], CITIES[j]]);
        }
    }
    return routes;
}

function buildFlightArcs(routes) {
    const material = createDepthFadeMaterial(0.3, 0.05);
    const group = new THREE.Group();

    for (const [cityA, cityB] of routes) {
        const points = computeArcPoints(cityA, cityB, 48);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        group.add(new THREE.Line(geometry, material));
    }

    return group;
}

const TRAIL_LEN = 18;

const impulseMaterial = new THREE.ShaderMaterial({
    vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        varying vec3 vWorldPosition;
        void main() {
            vAlpha = alpha;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    fragmentShader: `
        varying float vAlpha;
        varying vec3 vWorldPosition;
        void main() {
            vec3 normal = normalize(vWorldPosition);
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            float facing = smoothstep(-0.2, 1.0, dot(normal, viewDir));
            float a = vAlpha * facing;
            vec3 col = mix(vec3(0.3, 0.5, 1.0), vec3(1.0), vAlpha * vAlpha);
            gl_FragColor = vec4(col * a, a);
        }
    `,
    transparent: true,
    depthWrite: false,
});

function buildImpulses(routes) {
    const group = new THREE.Group();
    const impulses = [];

    for (const [cityA, cityB] of routes) {
        const arcPoints = computeArcPoints(cityA, cityB, 200);

        const positions = new Float32Array(TRAIL_LEN * 3);
        const alphas = new Float32Array(TRAIL_LEN);
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geom.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));

        const line = new THREE.Line(geom, impulseMaterial);
        line.frustumCulled = false;
        group.add(line);

        impulses.push({
            line,
            arcPoints,
            head: -1,
            direction: 1,
            cooldown: Math.random() * 4,
            speed: 80 + Math.random() * 160,
        });
    }

    return { group, impulses };
}

function updateImpulses(impulses, dt) {
    for (const imp of impulses) {
        const maxIdx = imp.arcPoints.length - 1;

        if (imp.head < 0) {
            imp.cooldown -= dt;
            if (imp.cooldown <= 0) {
                imp.direction = Math.random() > 0.5 ? 1 : -1;
                imp.head = imp.direction === 1 ? 0 : maxIdx;
                imp.speed = 80 + Math.random() * 160;
            }
        } else {
            imp.head += imp.direction * imp.speed * dt;
            if (imp.head > maxIdx + TRAIL_LEN || imp.head < -TRAIL_LEN) {
                imp.head = -1;
                imp.cooldown = 0.5 + Math.random() * 7;
            }
        }

        const posAttr = imp.line.geometry.getAttribute("position");
        const alphaAttr = imp.line.geometry.getAttribute("alpha");

        for (let i = 0; i < TRAIL_LEN; i++) {
            const idx = Math.floor(imp.head) - i * imp.direction;
            const clamped = Math.max(0, Math.min(maxIdx, idx));
            const pt = imp.arcPoints[clamped];
            posAttr.setXYZ(i, pt.x, pt.y, pt.z);

            const onArc = imp.head >= 0 && idx >= 0 && idx <= maxIdx;
            alphaAttr.setX(i, onArc ? Math.pow(1 - i / TRAIL_LEN, 2) : 0);
        }

        posAttr.needsUpdate = true;
        alphaAttr.needsUpdate = true;
    }
}

//
// init
//

async function initGlobe(scene) {
    const borders = await fetch("./data/countries-110m.json");
    const geojson = topoJsonToGeoJson(await borders.json());

    scene.add(buildGrid());
    scene.add(buildBorderLines(geojson));

    const routes = getFlightRoutes();
    scene.add(buildCityDots());
    scene.add(buildFlightArcs(routes));

    const { group, impulses } = buildImpulses(routes);
    scene.add(group);

    return { impulses };
}

export { initGlobe, updateImpulses };
