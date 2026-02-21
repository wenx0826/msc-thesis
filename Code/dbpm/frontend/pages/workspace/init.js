import { workspaceService } from "./services/index.js";
import { getProjectIdFromURL } from "../../shared/util/url.js";
import "./ui/index.js";

const projectId = getProjectIdFromURL();
workspaceService.loadWorkspace(projectId);
