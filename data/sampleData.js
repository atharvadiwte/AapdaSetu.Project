const hazardEvents = [
  {
    id: 'demo-fire-1',
    type: 'fire',
    lat: 21.146,
    lng: 79.088,
    title: 'Forest fire hotspot — Pench forest belt',
    severity: 'moderate',
    updated: 'Demo data',
    checklist: [
      'Avoid travel through the affected forest belt',
      'Keep windows shut if smoke/haze is visible nearby',
      'Report new hotspots to the local forest department'
    ]
  },
  {
    id: 'demo-flood-1',
    type: 'flood',
    lat: 19.076,
    lng: 72.877,
    title: 'Heavy monsoon flooding — low-lying wards',
    severity: 'high',
    updated: 'Demo data',
    checklist: [
      'Avoid waterlogged roads and underpasses',
      'Move vehicles and valuables to higher floors',
      'Keep phone charged; save local disaster helpline numbers'
    ]
  },
  {
    id: 'demo-cyclone-1',
    type: 'cyclone',
    lat: 19.822,
    lng: 85.831,
    title: 'Cyclone approaching — coastal Odisha',
    severity: 'high',
    updated: 'Demo data',
    checklist: [
      'Follow evacuation orders from local authorities immediately',
      'Secure loose objects outdoors',
      'Stock drinking water and a charged power bank'
    ]
  },
  {
    id: 'demo-landslide-1',
    type: 'landslide',
    lat: 30.073,
    lng: 78.297,
    title: 'Landslide risk — hill road after heavy rain',
    severity: 'moderate',
    updated: 'Demo data',
    checklist: [
      'Avoid driving on hill roads until cleared by authorities',
      'Watch for cracks or tilting trees on slopes above you',
      'Keep an alternate route in mind'
    ]
  }
];

const communityReports = [
  {
    id: 'community-report-1',
    type: 'flood',
    lat: 22.5726,
    lng: 88.3639,
    title: 'Waterlogged road near Kolkata market',
    severity: 'low',
    updated: 'Community report',
    note: 'Bus movement is slow and drainage is blocked.',
    checklist: [
      'Use an alternate route if possible',
      'Avoid deep puddles while walking',
      'Warn nearby residents about the flooded stretch'
    ]
  }
];

function mergeHazardData() {
  return [...hazardEvents, ...communityReports];
}

module.exports = {
  hazardEvents,
  communityReports,
  mergeHazardData
};
