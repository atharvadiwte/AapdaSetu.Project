const express = require('express');
const { hazardEvents, communityReports, mergeHazardData } = require('../data/sampleData');

const router = express.Router();

router.get('/hazards', (req, res) => {
  const hazards = mergeHazardData();

  res.json({
    success: true,
    count: hazards.length,
    data: hazards
  });
});

router.get('/hazards/:type', (req, res) => {
  const { type } = req.params;
  const filtered = mergeHazardData().filter((item) => item.type === type);

  if (!filtered.length) {
    return res.status(404).json({
      success: false,
      message: `No hazard events found for type: ${type}`
    });
  }

  res.json({
    success: true,
    count: filtered.length,
    data: filtered
  });
});

router.post('/reports', (req, res) => {
  const { type, lat, lng, title, note, severity } = req.body;

  if (!type || lat === undefined || lng === undefined || !note) {
    return res.status(400).json({
      success: false,
      message: 'type, lat, lng, and note are required'
    });
  }

  const newReport = {
    id: `report-${Date.now()}`,
    type,
    lat: Number(lat),
    lng: Number(lng),
    title: title || `${type.charAt(0).toUpperCase() + type.slice(1)} report`,
    severity: severity || 'low',
    updated: 'Community report',
    note,
    checklist: [
      'Avoid the reported area if it is unsafe',
      'Share this with nearby residents if needed',
      'Report to the local authorities if conditions worsen'
    ]
  };

  communityReports.push(newReport);

  res.status(201).json({
    success: true,
    message: 'Report saved successfully',
    data: newReport
  });
});

router.get('/firms', async (req, res) => {
  const apiKey = process.env.NASA_FIRMS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: 'Missing NASA_FIRMS_API_KEY',
      fallback: hazardEvents.filter((event) => event.type === 'fire')
    });
  }

  try {
    const response = await fetch(
      `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/world/1`
    );

    if (!response.ok) {
      throw new Error(`NASA FIRMS request failed with status ${response.status}`);
    }

    const text = await response.text();
    const rows = text.trim().split('\n').slice(1).filter(Boolean);

    const fires = rows.slice(0, 25).map((row, index) => {
      const values = row.split(',');
      const [latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, confidence] = values;
      const lat = Number(latitude);
      const lng = Number(longitude);
      const fireSeverity = Number(confidence || 0) > 70 ? 'high' : 'moderate';

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        id: `nasa-fire-${index + 1}`,
        type: 'fire',
        lat,
        lng,
        title: `NASA FIRMS hotspot (${acq_date})`,
        severity: fireSeverity,
        updated: `${acq_date} ${acq_time}`,
        note: `Brightness: ${brightness}, confidence: ${confidence}`,
        checklist: [
          'Avoid smoke-heavy areas',
          'Follow local fire response instructions',
          'Keep emergency contacts ready'
        ]
      };
    }).filter(Boolean);

    res.json({
      success: true,
      source: 'nasa-firms',
      count: fires.length,
      data: fires
    });
  } catch (error) {
    console.error('NASA FIRMS proxy error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Unable to fetch NASA FIRMS data right now',
      fallback: hazardEvents.filter((event) => event.type === 'fire')
    });
  }
});

router.get('/landslide-risk', async (req, res) => {
  try {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson');

    if (!response.ok) {
      throw new Error(`USGS request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const features = Array.isArray(payload.features) ? payload.features : [];

    const landslideRiskEvents = features
      .filter((feature) => feature && feature.geometry && Array.isArray(feature.geometry.coordinates))
      .slice(0, 30)
      .map((feature, index) => {
        const coords = feature.geometry.coordinates;
        const props = feature.properties || {};
        const magnitude = Number(props.mag || 0);
        const lat = Number(coords[1]);
        const lng = Number(coords[0]);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        return {
          id: `usgs-landslide-${props.code || index}`,
          type: 'landslide',
          lat,
          lng,
          title: 'Seismic activity (landslide risk indicator)',
          severity: magnitude >= 6 ? 'high' : magnitude >= 5 ? 'moderate' : 'low',
          updated: `USGS • M${magnitude.toFixed(1)} • ${props.place || 'Earthquake'} • ${new Date(props.time).toISOString().slice(0, 10)}`,
          note: `${props.place || 'Regional'} earthquake with magnitude ${magnitude.toFixed(1)}. This is a landslide-risk indicator, not a confirmed landslide.`,
          checklist: [
            'Treat this as a landslide-risk indicator, not a confirmed slope failure',
            'Avoid steep or unstable slopes if nearby',
            'Follow local emergency guidance and road closures'
          ]
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      source: 'usgs-earthquakes',
      count: landslideRiskEvents.length,
      data: landslideRiskEvents
    });
  } catch (error) {
    console.error('USGS landslide-risk proxy error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Unable to fetch USGS earthquake risk data right now',
      fallback: hazardEvents.filter((event) => event.type === 'landslide')
    });
  }
});

function stripXmlText(value) {
  return (value || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
}

function findValue(xmlText, pattern) {
  const match = xmlText.match(pattern);
  return match ? stripXmlText(match[1]) : '';
}

router.get('/gdacs', async (req, res) => {
  try {
    const response = await fetch('https://www.gdacs.org/xml/rss.xml', {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`GDACS request failed with status ${response.status}`);
    }

    const xmlText = await response.text();
    const rawItems = [...xmlText.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];

    const events = rawItems
      .map((match) => match[1])
      .map((itemXml) => {
        const eventType = findValue(itemXml, /<gdacs:eventtype>([\s\S]*?)<\/gdacs:eventtype>/i) ||
          findValue(itemXml, /<eventtype>([\s\S]*?)<\/eventtype>/i);
        const type = eventType.toUpperCase() === 'FL' ? 'flood' : eventType.toUpperCase() === 'TC' ? 'cyclone' : null;

        if (!type) return null;

        const lat = Number.parseFloat(
          findValue(itemXml, /<geo:lat>([\s\S]*?)<\/geo:lat>/i) ||
          findValue(itemXml, /<georss:point>([\s\S]*?)<\/georss:point>/i).split(/\s+/)[0] ||
          findValue(itemXml, /<lat>([\s\S]*?)<\/lat>/i)
        );

        const lng = Number.parseFloat(
          findValue(itemXml, /<geo:long>([\s\S]*?)<\/geo:long>/i) ||
          findValue(itemXml, /<georss:point>([\s\S]*?)<\/georss:point>/i).split(/\s+/)[1] ||
          findValue(itemXml, /<lng>([\s\S]*?)<\/lng>/i)
        );

        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

        const title = findValue(itemXml, /<title>([\s\S]*?)<\/title>/i) || `${type.charAt(0).toUpperCase() + type.slice(1)} alert`;
        const alertLevel = findValue(itemXml, /<gdacs:alertlevel>([\s\S]*?)<\/gdacs:alertlevel>/i) || 'Green';
        const updated = findValue(itemXml, /<gdacs:datemodified>([\s\S]*?)<\/gdacs:datemodified>/i) ||
          findValue(itemXml, /<pubDate>([\s\S]*?)<\/pubDate>/i) || 'Live GDACS feed';
        const eventId = findValue(itemXml, /<gdacs:eventid>([\s\S]*?)<\/gdacs:eventid>/i) || `${type}-${Date.now()}`;

        const severity = ['red', 'extreme', 'catastrophic', 'high'].includes(alertLevel.toLowerCase())
          ? 'high'
          : ['orange', 'yellow', 'moderate', 'warning'].includes(alertLevel.toLowerCase())
            ? 'moderate'
            : 'low';

        const checklist = type === 'flood'
          ? [
              'Avoid waterlogged roads and underpasses',
              'Move vehicles and valuables to higher floors',
              'Keep phone charged; save local disaster helpline numbers'
            ]
          : [
              'Follow evacuation orders from local authorities immediately',
              'Secure loose objects outdoors',
              'Stock drinking water and a charged power bank'
            ];

        return {
          id: `gdacs-${type}-${eventId}`,
          type,
          lat,
          lng,
          title,
          severity,
          updated: `GDACS • ${updated}`,
          checklist
        };
      })
      .filter(Boolean)
      .filter((event, index, allEvents) => allEvents.findIndex((other) => other.id === event.id) === index);

    res.json({
      success: true,
      source: 'gdacs',
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('GDACS proxy error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Unable to fetch GDACS data right now',
      fallback: []
    });
  }
});

module.exports = router;
