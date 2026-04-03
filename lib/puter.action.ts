import puter from "@heyputer/puter.js";
import {
	getOrCreateHostingConfig,
	uploadImageToHosting,
} from "./puter.hosting";
import { isHostedUrl } from "./utils";
import { PUTER_WORKER_URL } from "./constants";

export const signIn = async () => await puter.auth.signIn();
export const signOut = async () => await puter.auth.signOut();

export const getCurrentUser = async () => {
	try {
		return await puter.auth.getUser();
	} catch {
		return null;
	}
};

/**
 * Ensures the image string is a proper data: URL.
 * If it's already a data: URL or hosted URL, returns as-is.
 * If it's raw base64, wraps it in a data:image/png;base64, prefix.
 */
const ensureDataUrl = (image: string): string => {
	if (!image) return image;
	if (image.startsWith("data:") || image.startsWith("http")) return image;
	// Raw base64 string — wrap as a data URL
	return `data:image/png;base64,${image}`;
};

export const createProject = async ({
	item,
	visibility = "private",
}: CreateProjectParams): Promise<DesignItem | null | undefined> => {
	const projectId = item.id;

	// Ensure the sourceImage is a valid URL (data: or hosted)
	const sourceUrl = ensureDataUrl(item.sourceImage);

	let hosting: { subdomain: string } | null = null;
	try {
		hosting = await getOrCreateHostingConfig();
	} catch (e) {
		console.warn(
			"Could not set up hosting config, continuing without hosting:",
			e,
		);
	}

	let hostedSource: { url: string } | null = null;
	if (hosting && projectId) {
		try {
			hostedSource = await uploadImageToHosting({
				hosting,
				url: sourceUrl,
				projectId,
				label: "source",
			});
		} catch (e) {
			console.warn("Failed to upload source image to hosting:", e);
		}
	}

	let hostedRender: { url: string } | null = null;
	if (hosting && projectId && item.renderedImage) {
		try {
			hostedRender = await uploadImageToHosting({
				hosting,
				url: ensureDataUrl(item.renderedImage),
				projectId,
				label: "rendered",
			});
		} catch (e) {
			console.warn("Failed to upload rendered image to hosting:", e);
		}
	}

	// Use hosted URL if available, otherwise fall back to the data URL
	const resolvedSource =
		hostedSource?.url ||
		(isHostedUrl(item.sourceImage) ? item.sourceImage : sourceUrl);

	const resolvedRender = hostedRender?.url
		? hostedRender.url
		: item.renderedImage && isHostedUrl(item.renderedImage)
			? item.renderedImage
			: item.renderedImage
				? ensureDataUrl(item.renderedImage)
				: undefined;

	const {
		sourcePath: _sourcePath,
		renderedPath: _renderedPath,
		publicPath: _publicPath,
		...rest
	} = item;
	const payload: DesignItem = {
		...rest,
		sourceImage: resolvedSource,
		renderedImage: resolvedRender,
		isPublic: visibility === "public",
	};

	try {
		if (!PUTER_WORKER_URL) {
			console.warn("Missing PUTER_WORKER_URL; skipping project save.");
			return payload;
		}

		// Store project in Puter KV
		const response = await puter.workers.exec(
			`${PUTER_WORKER_URL}/api/projects/save`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ project: payload, visibility }),
			},
		);
		if (!response.ok) {
			console.error("Failed to save project", await response.text());
			return null;
		}
		const data = (await response.json()) as { project?: DesignItem | null };
		return data?.project ?? null;
	} catch (e) {
		console.warn(`Failed to save project: ${e}`);
		// Still return the payload so navigation works even if KV fails
		return payload;
	}
};

export const getProjects = async () => {
	if (!PUTER_WORKER_URL) {
		console.warn("Missing VITE_PUTER_WORKER_URL; skip history fetch;");
		return null;
	}
	try {
		const response = await puter.workers.exec(
			`${PUTER_WORKER_URL}/api/projects/list`,
			{
				method: "GET",
			},
		);
		if (!response.ok) {
			console.error("Failed to fetch history", await response.text());
			return [];
		}
		const data = (await response.json()) as { projects?: DesignItem[] | null };
		return Array.isArray(data?.projects) ? data.projects : [];
	} catch (e) {
		console.warn("Failed to fetch projects:", e);
		return [];
	}
};

export const getProjectById = async ({ id }: { id: string }) => {
	if (!PUTER_WORKER_URL) {
		console.warn("Missing VITE_PUTER_WORKER_URL; skipping project fetch.");
		return null;
	}

	console.log("Fetching project with ID:", id);

	try {
		const response = await puter.workers.exec(
			`${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
			{ method: "GET" },
		);

		console.log("Fetch project response:", response);

		if (!response.ok) {
			console.error("Failed to fetch project:", await response.text());
			return null;
		}

		const data = (await response.json()) as {
			project?: DesignItem | null;
		};

		console.log("Fetched project data:", data);

		return data?.project ?? null;
	} catch (error) {
		console.error("Failed to fetch project:", error);
		return null;
	}
};
