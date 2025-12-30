// import { PipelineStage } from "mongoose";

// Extend the PipelineStage type to include $facet
declare module "mongoose" {
  interface FacetPipelineStage {
    $facet?: {
      [key: string]: FacetPipelineStage[];
    };
  }
}