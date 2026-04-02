import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("*", "routes/not-found.tsx"),
	route("visualizer/:id", "./routes/visualizer.$id.tsx"),
] satisfies RouteConfig;
