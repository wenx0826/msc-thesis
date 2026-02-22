import { workspaceService } from "./services/index.js";
import { getProjectIdFromURL } from "../../shared/utils/url.js";
import "./ui/index.js";

const projectId = getProjectIdFromURL();
workspaceService.loadWorkspace(projectId);
