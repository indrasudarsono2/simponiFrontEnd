// Mock API endpoint to fetch available ESSAY question groups with sector-rating info
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Based on rating.json - only ESSAY type question groups
  // Each group is associated with a specific sector-rating combination
  const questionGroups = [
    // WEST ACP
    {
      id: 1,
      label: "PENDEK",
      group: "PENDEK",
      sectorId: 1,
      sector: "WEST",
      ratingId: 4,
      rating: "ACP",
    },
    {
      id: 2,
      label: "PANJANG",
      group: "PANJANG",
      sectorId: 1,
      sector: "WEST",
      ratingId: 4,
      rating: "ACP",
    },
    // WEST ACS
    {
      id: 11,
      label: "PENDEK",
      group: "PENDEK",
      sectorId: 1,
      sector: "WEST",
      ratingId: 5,
      rating: "ACS",
    },
    {
      id: 12,
      label: "PANJANG",
      group: "PANJANG",
      sectorId: 1,
      sector: "WEST",
      ratingId: 5,
      rating: "ACS",
    },
    // EAST ACP
    {
      id: 21,
      label: "PENDEK",
      group: "PENDEK",
      sectorId: 2,
      sector: "EAST",
      ratingId: 4,
      rating: "ACP",
    },
    {
      id: 22,
      label: "PANJANG",
      group: "PANJANG",
      sectorId: 2,
      sector: "EAST",
      ratingId: 4,
      rating: "ACP",
    },
    // EAST ACS
    {
      id: 31,
      label: "PENDEK",
      group: "PENDEK",
      sectorId: 2,
      sector: "EAST",
      ratingId: 5,
      rating: "ACS",
    },
    {
      id: 32,
      label: "PANJANG",
      group: "PANJANG",
      sectorId: 2,
      sector: "EAST",
      ratingId: 5,
      rating: "ACS",
    },
    // NORTH ACP
    {
      id: 41,
      label: "PENDEK",
      group: "PENDEK",
      sectorId: 3,
      sector: "NORTH",
      ratingId: 4,
      rating: "ACP",
    },
    {
      id: 42,
      label: "PANJANG",
      group: "PANJANG",
      sectorId: 3,
      sector: "NORTH",
      ratingId: 4,
      rating: "ACP",
    },
    // NORTH ACS
    {
      id: 51,
      label: "PENDEK",
      group: "PENDEK",
      sectorId: 3,
      sector: "NORTH",
      ratingId: 5,
      rating: "ACS",
    },
    {
      id: 52,
      label: "PANJANG",
      group: "PANJANG",
      sectorId: 3,
      sector: "NORTH",
      ratingId: 5,
      rating: "ACS",
    },
    // NORTH WEST ACP
    {
      id: 61,
      label: "PENDEK",
      group: "PENDEK",
      sectorId: 4,
      sector: "NORTH WEST",
      ratingId: 4,
      rating: "ACP",
    },
    {
      id: 62,
      label: "PANJANG",
      group: "PANJANG",
      sectorId: 4,
      sector: "NORTH WEST",
      ratingId: 4,
      rating: "ACP",
    },
    // NORTH WEST ACS
    {
      id: 71,
      label: "PENDEK",
      group: "PENDEK",
      sectorId: 4,
      sector: "NORTH WEST",
      ratingId: 5,
      rating: "ACS",
    },
    {
      id: 72,
      label: "PANJANG",
      group: "PANJANG",
      sectorId: 4,
      sector: "NORTH WEST",
      ratingId: 5,
      rating: "ACS",
    },
    // NORTH EAST ACP
    {
      id: 81,
      label: "PENDEK",
      group: "PENDEK",
      sectorId: 5,
      sector: "NORTH EAST",
      ratingId: 4,
      rating: "ACP",
    },
    {
      id: 82,
      label: "PANJANG",
      group: "PANJANG",
      sectorId: 5,
      sector: "NORTH EAST",
      ratingId: 4,
      rating: "ACP",
    },
    // NORTH EAST ACS
    {
      id: 91,
      label: "PENDEK",
      group: "PENDEK",
      sectorId: 5,
      sector: "NORTH EAST",
      ratingId: 5,
      rating: "ACS",
    },
    {
      id: 92,
      label: "PANJANG",
      group: "PANJANG",
      sectorId: 5,
      sector: "NORTH EAST",
      ratingId: 5,
      rating: "ACS",
    },
  ];

  return questionGroups;
});
