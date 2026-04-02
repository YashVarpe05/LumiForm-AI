import puter from "@heyputer/puter.js";
import {
	getOrCreateHostingConfig,
	uploadImageToHosting,
} from "./puter.hosting";
import { isHostedUrl } from "./utils";

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
	visibility,
}: CreateProjectParams): Promise<DesignItem | null | undefined> => {
	const projectId = item.id;

	// Ensure the sourceImage is a valid URL (data: or hosted)
	const sourceUrl = ensureDataUrl(item.sourceImage);

	let hosting: { subdomain: string } | null = null;
	try {
		hosting = await getOrCreateHostingConfig();
	} catch (e) {
		console.warn("Could not set up hosting config, continuing without hosting:", e);
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
		// Store project in Puter KV
		await puter.kv.set(`project:${projectId}`, JSON.stringify(payload));
		return payload;
	} catch (e) {
		console.warn(`Failed to save project: ${e}`);
		// Still return the payload so navigation works even if KV fails
		return payload;
	}
};

