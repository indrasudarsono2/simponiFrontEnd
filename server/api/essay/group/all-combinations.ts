// Mock API endpoint to fetch all sector-rating-group combinations
// Based on rating.json structure
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Based on rating.json - all sector-rating-group combinations for ACC
  // Format: "SECTOR RATING GROUP" (e.g., "WEST ACP PENDEK")
  const allCombinations = [
    // WEST ACP
    {
      id: "1-4-1",
      label: "WEST ACP PENDEK",
      sectorId: 1,
      sector: "WEST",
      ratingId: 4,
      rating: "ACP",
      questionGroupId: 1,
      questionGroup: "PENDEK",
    },
    {
      id: "1-4-2",
      label: "WEST ACP PANJANG",
      sectorId: 1,
      sector: "WEST",
      ratingId: 4,
      rating: "ACP",
      questionGroupId: 2,
      questionGroup: "PANJANG",
    },
    // WEST ACS
    {
      id: "1-5-11",
      label: "WEST ACS PENDEK",
      sectorId: 1,
      sector: "WEST",
      ratingId: 5,
      rating: "ACS",
      questionGroupId: 11,
      questionGroup: "PENDEK",
    },
    {
      id: "1-5-12",
      label: "WEST ACS PANJANG",
      sectorId: 1,
      sector: "WEST",
      ratingId: 5,
      rating: "ACS",
      questionGroupId: 12,
      questionGroup: "PANJANG",
    },
    // EAST ACP
    {
      id: "2-4-21",
      label: "EAST ACP PENDEK",
      sectorId: 2,
      sector: "EAST",
      ratingId: 4,
      rating: "ACP",
      questionGroupId: 21,
      questionGroup: "PENDEK",
    },
    {
      id: "2-4-22",
      label: "EAST ACP PANJANG",
      sectorId: 2,
      sector: "EAST",
      ratingId: 4,
      rating: "ACP",
      questionGroupId: 22,
      questionGroup: "PANJANG",
    },
    // EAST ACS
    {
      id: "2-5-31",
      label: "EAST ACS PENDEK",
      sectorId: 2,
      sector: "EAST",
      ratingId: 5,
      rating: "ACS",
      questionGroupId: 31,
      questionGroup: "PENDEK",
    },
    {
      id: "2-5-32",
      label: "EAST ACS PANJANG",
      sectorId: 2,
      sector: "EAST",
      ratingId: 5,
      rating: "ACS",
      questionGroupId: 32,
      questionGroup: "PANJANG",
    },
    // NORTH ACP
    {
      id: "3-4-41",
      label: "NORTH ACP PENDEK",
      sectorId: 3,
      sector: "NORTH",
      ratingId: 4,
      rating: "ACP",
      questionGroupId: 41,
      questionGroup: "PENDEK",
    },
    {
      id: "3-4-42",
      label: "NORTH ACP PANJANG",
      sectorId: 3,
      sector: "NORTH",
      ratingId: 4,
      rating: "ACP",
      questionGroupId: 42,
      questionGroup: "PANJANG",
    },
    // NORTH ACS
    {
      id: "3-5-51",
      label: "NORTH ACS PENDEK",
      sectorId: 3,
      sector: "NORTH",
      ratingId: 5,
      rating: "ACS",
      questionGroupId: 51,
      questionGroup: "PENDEK",
    },
    {
      id: "3-5-52",
      label: "NORTH ACS PANJANG",
      sectorId: 3,
      sector: "NORTH",
      ratingId: 5,
      rating: "ACS",
      questionGroupId: 52,
      questionGroup: "PANJANG",
    },
    // NORTH WEST ACP
    {
      id: "4-4-61",
      label: "NORTH WEST ACP PENDEK",
      sectorId: 4,
      sector: "NORTH WEST",
      ratingId: 4,
      rating: "ACP",
      questionGroupId: 61,
      questionGroup: "PENDEK",
    },
    {
      id: "4-4-62",
      label: "NORTH WEST ACP PANJANG",
      sectorId: 4,
      sector: "NORTH WEST",
      ratingId: 4,
      rating: "ACP",
      questionGroupId: 62,
      questionGroup: "PANJANG",
    },
    // NORTH WEST ACS
    {
      id: "4-5-71",
      label: "NORTH WEST ACS PENDEK",
      sectorId: 4,
      sector: "NORTH WEST",
      ratingId: 5,
      rating: "ACS",
      questionGroupId: 71,
      questionGroup: "PENDEK",
    },
    {
      id: "4-5-72",
      label: "NORTH WEST ACS PANJANG",
      sectorId: 4,
      sector: "NORTH WEST",
      ratingId: 5,
      rating: "ACS",
      questionGroupId: 72,
      questionGroup: "PANJANG",
    },
    // NORTH EAST ACP
    {
      id: "5-4-81",
      label: "NORTH EAST ACP PENDEK",
      sectorId: 5,
      sector: "NORTH EAST",
      ratingId: 4,
      rating: "ACP",
      questionGroupId: 81,
      questionGroup: "PENDEK",
    },
    {
      id: "5-4-82",
      label: "NORTH EAST ACP PANJANG",
      sectorId: 5,
      sector: "NORTH EAST",
      ratingId: 4,
      rating: "ACP",
      questionGroupId: 82,
      questionGroup: "PANJANG",
    },
    // NORTH EAST ACS
    {
      id: "5-5-91",
      label: "NORTH EAST ACS PENDEK",
      sectorId: 5,
      sector: "NORTH EAST",
      ratingId: 5,
      rating: "ACS",
      questionGroupId: 91,
      questionGroup: "PENDEK",
    },
    {
      id: "5-5-92",
      label: "NORTH EAST ACS PANJANG",
      sectorId: 5,
      sector: "NORTH EAST",
      ratingId: 5,
      rating: "ACS",
      questionGroupId: 92,
      questionGroup: "PANJANG",
    },
  ];

  return allCombinations;
});
