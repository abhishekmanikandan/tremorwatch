// Tremorpulse front-end: fetches /api/quakes (same-origin, so no CORS to worry
// about) and renders the stat cards, table, and Leaflet map. Polls every 60s to
// match the edge cache TTL set in functions/api/quakes.js — polling faster than
// that would just re-serve the same cached response.

(function () {
  var REFRESH_MS = 60000;
  var state = { feed: 'day', minMag: 0, quakes: [], timer: null };

  var map, markerLayer;

  document.getElementById('year').textContent = new Date().getFullYear();

  function magClass(mag) {
    if (mag >= 6) return 'mag-badge m6';
    if (mag >= 4) return 'mag-badge m4';
    return 'mag-badge';
  }

  function fmtTime(ms) {
    try {
      return new Date(ms).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch (e) { return '—'; }
  }

  function renderStats(quakes) {
    var countEl = document.getElementById('stat-count');
    var maxMagEl = document.getElementById('stat-max-mag');
    var topRegionEl = document.getElementById('stat-top-region');
    var updatedEl = document.getElementById('stat-updated');

    countEl.textContent = quakes.length;

    if (quakes.length === 0) {
      maxMagEl.textContent = '–';
      topRegionEl.textContent = '–';
      updatedEl.textContent = new Date().toLocaleTimeString();
      return;
    }

    var strongest = quakes.reduce(function (a, b) { return (b.mag || 0) > (a.mag || 0) ? b : a; });
    maxMagEl.textContent = (strongest.mag != null ? strongest.mag.toFixed(1) : '–');
    maxMagEl.className = 'value ' + (strongest.mag >= 5 ? 'mag-high' : '');

    var regionCounts = {};
    quakes.forEach(function (q) {
      var region = (q.place || '').split(', ').pop() || 'Unknown';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    var topRegion = Object.keys(regionCounts).sort(function (a, b) { return regionCounts[b] - regionCounts[a]; })[0];
    topRegionEl.textContent = topRegion || '–';

    updatedEl.textContent = new Date().toLocaleTimeString();
  }

  function renderTable(quakes) {
    var tbody = document.getElementById('quake-rows');
    if (quakes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No quakes match this filter in the selected range.</td></tr>';
      return;
    }
    var rows = quakes
      .slice()
      .sort(function (a, b) { return b.time - a.time; })
      .slice(0, 200)
      .map(function (q) {
        var mag = q.mag != null ? q.mag.toFixed(1) : '–';
        return '<tr>' +
          '<td>' + fmtTime(q.time) + '</td>' +
          '<td><span class="' + magClass(q.mag || 0) + '">' + mag + '</span></td>' +
          '<td class="place">' + escapeHtml(q.place || 'Unknown location') + '</td>' +
          '<td>' + (q.depthKm != null ? q.depthKm.toFixed(1) : '–') + '</td>' +
          '<td><a href="' + q.url + '" target="_blank" rel="noopener">USGS report ↗</a></td>' +
          '</tr>';
      })
      .join('');
    tbody.innerHTML = rows;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function ensureMap() {
    if (map) return;
    map = L.map('map', { worldCopyJump: true }).setView([20, 0], 2);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      maxZoom: 10,
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
  }

  function renderMap(quakes) {
    ensureMap();
    markerLayer.clearLayers();
    quakes.forEach(function (q) {
      if (q.lat == null || q.lon == null) return;
      var mag = q.mag || 0;
      var radius = Math.max(3, mag * 2.4);
      var color = mag >= 6 ? '#ff5a4e' : mag >= 4 ? '#ffb020' : '#2fd6a7';
      L.circleMarker([q.lat, q.lon], {
        radius: radius, color: color, fillColor: color, fillOpacity: 0.55, weight: 1,
      })
        .bindPopup('<strong>M ' + mag.toFixed(1) + '</strong><br>' + escapeHtml(q.place || '') + '<br>' + fmtTime(q.time))
        .addTo(markerLayer);
    });
  }

  function applyFilterAndRender() {
    var filtered = state.quakes.filter(function (q) { return (q.mag || 0) >= state.minMag; });
    renderStats(filtered);
    renderTable(filtered);
    renderMap(filtered);
  }

  function setStatus(msg) {
    document.getElementById('status-line').textContent = msg;
  }

  function load() {
    setStatus('Refreshing…');
    fetch('/api/quakes?feed=' + encodeURIComponent(state.feed))
      .then(function (r) {
        if (!r.ok) throw new Error('bad response');
        return r.json();
      })
      .then(function (data) {
        state.quakes = data.quakes || [];
        applyFilterAndRender();
        setStatus('Live · updated ' + new Date().toLocaleTimeString());
      })
      .catch(function () {
        setStatus('Could not reach the live feed — retrying shortly.');
      });
  }

  function scheduleRefresh() {
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(load, REFRESH_MS);
  }

  document.getElementById('feed-select').addEventListener('change', function (e) {
    state.feed = e.target.value;
    load();
  });
  document.getElementById('mag-select').addEventListener('change', function (e) {
    state.minMag = parseFloat(e.target.value) || 0;
    applyFilterAndRender();
  });
  document.getElementById('refresh-btn').addEventListener('click', load);

  load();
  scheduleRefresh();
})();
