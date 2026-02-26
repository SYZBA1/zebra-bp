export interface OutlineNode {
  id: string;
  title: string;
  titleAm?: string;
  children?: OutlineNode[];
  content?: string;
}

export const FEASIBILITY_OUTLINE: OutlineNode[] = [
  { id: "cover", title: "Cover Page Details" },
  { id: "1", title: "Executive Summary" },
  {
    id: "2", title: "Introduction", children: [
      { id: "2.1", title: "Economic Background" },
      { id: "2.2", title: "Growth and Drivers" },
    ]
  },
  {
    id: "3", title: "Background of Project Area", children: [
      { id: "3.1", title: "Location" },
      { id: "3.2", title: "Demographics" },
      { id: "3.3", title: "Cultural Context" },
      { id: "3.4", title: "Sector-Relevant Resources" },
      { id: "3.5", title: "Infrastructure" },
      { id: "3.6", title: "Natural Resources" },
      { id: "3.7", title: "Socio-economic Situations" },
      { id: "3.8", title: "Sustainability Assessment" },
      { id: "3.9", title: "Operational Risks" },
      { id: "3.10", title: "SWOT Analysis" },
    ]
  },
  {
    id: "4", title: "Product/Service Description", children: [
      { id: "4.1", title: "Primary Product/Service" },
      { id: "4.2", title: "Secondary Products/By-products" },
      { id: "4.3", title: "Project Objectives" },
      { id: "4.4", title: "Benefits of the Project" },
    ]
  },
  {
    id: "5", title: "Market Study & Capacity", children: [
      { id: "5.1", title: "Market Analysis" },
      { id: "5.2", title: "Demand Projection" },
      { id: "5.3", title: "Pricing and Distribution" },
      { id: "5.4", title: "Target Market Location" },
      { id: "5.5", title: "Sector Features" },
      { id: "5.6", title: "Beneficiaries" },
      { id: "5.7", title: "Competitor Analysis" },
      { id: "5.8", title: "Project Justification" },
      { id: "5.9", title: "Strategic Support" },
    ]
  },
  {
    id: "6", title: "Operational Capacity & Program", children: [
      { id: "6.1", title: "Installed Capacity" },
      { id: "6.2", title: "Production/Service Program" },
    ]
  },
  {
    id: "7", title: "Inputs and Utilities", children: [
      { id: "7.1", title: "Direct Inputs" },
      { id: "7.2", title: "Utilities" },
    ]
  },
  {
    id: "8", title: "Technology and Engineering", children: [
      { id: "8.1", title: "Technology Choice" },
      { id: "8.2", title: "Engineering & Assets" },
    ]
  },
  {
    id: "9", title: "Organization & Management", children: [
      { id: "9.1", title: "Manpower Requirement" },
      { id: "9.2", title: "Organizational Structure" },
      { id: "9.3", title: "Training Needs" },
      { id: "9.4", title: "Implementation Schedule" },
    ]
  },
  {
    id: "10", title: "Financial Feasibility", children: [
      { id: "10.1", title: "Basic Assumptions" },
      { id: "10.2", title: "Financial Analysis Results" },
      { id: "10.3", title: "Revenue Projections" },
      { id: "10.4", title: "Key Metrics" },
      { id: "10.5", title: "Risk Analysis" },
      { id: "10.6", title: "Impact Assessment" },
    ]
  },
  { id: "11", title: "Conclusion & Recommendation" },
  { id: "annexes", title: "Annexes" },
];

export const SECTORS = [
  "Tour and Travel",
  "Car Rental",
  "Construction, Engineering & Real Estate",
  "Education / University, School & Training",
  "Automotive",
  "Information Technology",
  "Advertising, Promotion, Media & Entertainment",
  "Food & Beverages, Café & Restaurant",
  "Professional Services",
  "Agriculture",
  "Transport",
  "Hospitality",
  "Shopping",
  "Health",
  "Manufacturing & Industry",
  "Export",
  "Foreign Suppliers to Ethiopia",
  "Government & Organizations",
  "Associations & NGOs",
];
