const PROJECT_PREFIX = "lumiform_project_";

const jsonError = (status, message, extra = {}) => {
	return new Response(JSON.stringify({ error: message, ...extra }), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
};

const getUserId = async (userPuter) => {
	try {
		const user = await userPuter.auth.getUser();
		return user?.uuid || null;
	} catch (e) {
		console.error("Failed to get user ID:", e);
		return null;
	}
};

router.post("/api/projects/save", async ({ request, user }) => {
	try {
		const userPuter = user?.puter;
		if (!userPuter) return jsonError(401, "Authentication Failed");

		const userId = await getUserId(userPuter);
		if (!userId) return jsonError(401, "Authentication Failed");

		const body = await request.json();
		const project = body?.project;

		if (!project?.id || !project?.sourceImage)
			return jsonError(400, "Invalid project data");

		const payload = {
			...project,
			updatedAt: new Date().toISOString(),
		};
		const key = `${PROJECT_PREFIX}${project.id}`;
		await userPuter.kv.set(key, JSON.stringify(payload));
		return { saved: true, id: project.id, project: payload };
	} catch (e) {
		return jsonError(500, "Failed to save project", {
			message: e.message || "Unknown error",
		});
	}
});

router.get("/api/projects/list", async ({ user }) => {
	try {
		const userPuter = user?.puter;
		if (!userPuter) return jsonError(401, "Authentication Failed");

		const userId = await getUserId(userPuter);
		if (!userId) return jsonError(401, "Authentication Failed");

		// const items = await userPuter.kv.list(`${PROJECT_PREFIX}*`, true);
		// const projects = items
		// 	.map((item) => {
		// 		try {
		// 			return JSON.parse(item.value);
		// 		} catch {
		// 			return null;
		// 		}
		// 	})
		// 	.filter(Boolean);

		const projects = (await userPuter.kv.list(PROJECT_PREFIX, true)).map(
			({ value }) => {
				try {
					const project = typeof value === 'string' ? JSON.parse(value) : value;
					return { ...project, isPublic: true };
				} catch (e) {
					return null;
				}
			},
		).filter(Boolean);

		return { projects };
	} catch (e) {
		return jsonError(500, "Failed to list projects", {
			message: e.message || "Unknown error",
		});
	}
});

router.get("/api/projects/get", async ({ request, user }) => {
	try {
		const userPuter = user?.puter;
		if (!userPuter) return jsonError(401, "Authentication Failed");

		const userId = await getUserId(userPuter);
		if (!userId) return jsonError(401, "Authentication Failed");

		const url = new URL(request.url);
		const id = url.searchParams.get("id");
		if (!id) return jsonError(400, "Missing project id");

		const key = `${PROJECT_PREFIX}${id}`;
		const raw = await userPuter.kv.get(key);
		if (!raw) return jsonError(404, "Project not found");

		const project = JSON.parse(raw);
		return { project };
	} catch (e) {
		return jsonError(500, "Failed to get project", {
			message: e.message || "Unknown error",
		});
	}
});
