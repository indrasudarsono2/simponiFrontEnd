// Mock API endpoint to fetch available sector-rating combinations
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Based on rating.json - all sector-rating combinations for ACC
  // Format: "SECTOR RATING" (e.g., "WEST ACP", "EAST ACS")
  const sectorRatings = [
    {
      id: "1-4",
      label: "WEST ACP",
      sectorId: 1,
      sector: "WEST",
      ratingId: 4,
      rating: "ACP",
    },
    {
      id: "1-5",
      label: "WEST ACS",
      sectorId: 1,
      sector: "WEST",
      ratingId: 5,
      rating: "ACS",
    },
    {
      id: "2-4",
      label: "EAST ACP",
      sectorId: 2,
      sector: "EAST",
      ratingId: 4,
      rating: "ACP",
    },
    {
      id: "2-5",
      label: "EAST ACS",
      sectorId: 2,
      sector: "EAST",
      ratingId: 5,
      rating: "ACS",
    },
    {
      id: "3-4",
      label: "NORTH ACP",
      sectorId: 3,
      sector: "NORTH",
      ratingId: 4,
      rating: "ACP",
    },
    {
      id: "3-5",
      label: "NORTH ACS",
      sectorId: 3,
      sector: "NORTH",
      ratingId: 5,
      rating: "ACS",
    },
    {
      id: "4-4",
      label: "NORTH WEST ACP",
      sectorId: 4,
      sector: "NORTH WEST",
      ratingId: 4,
      rating: "ACP",
    },
    {
      id: "4-5",
      label: "NORTH WEST ACS",
      sectorId: 4,
      sector: "NORTH WEST",
      ratingId: 5,
      rating: "ACS",
    },
    {
      id: "5-4",
      label: "NORTH EAST ACP",
      sectorId: 5,
      sector: "NORTH EAST",
      ratingId: 4,
      rating: "ACP",
    },
    {
      id: "5-5",
      label: "NORTH EAST ACS",
      sectorId: 5,
      sector: "NORTH EAST",
      ratingId: 5,
      rating: "ACS",
    },
  ];

  return sectorRatings;
});
