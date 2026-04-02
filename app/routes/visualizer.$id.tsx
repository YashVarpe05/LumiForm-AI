import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";
import puter from "@heyputer/puter.js";

const VisualizerId = () => {
	const { id } = useParams();
	const location = useLocation();

	const [projectData, setProjectData] = useState<{
		initialImage?: string | null;
		name?: string | null;
	}>({
		initialImage: location.state?.initialImage,
		name: location.state?.name,
	});

	useEffect(() => {
		const loadProject = async () => {
			if (!id) return;

			try {
				const kvData = await puter.kv.get(`project:${id}`);
				if (kvData) {
					const parsed = JSON.parse(kvData as string) as DesignItem;
					setProjectData((prev) => ({
						initialImage: prev.initialImage || parsed.sourceImage,
						name: prev.name || parsed.name,
					}));
					return;
				}
			} catch (e) {
				console.warn("Failed to fetch project from KV:", e);
			}

			// Fallback to localStorage
			const localImage = localStorage.getItem(`visualizer:image:${id}`);
			if (localImage) {
				setProjectData((prev) => ({
					initialImage: prev.initialImage || localImage,
					name: prev.name || `Residence ${id}`,
				}));
			}
		};

		loadProject();
	}, [id]);

	const { initialImage, name } = projectData;

	return (
		<section>
			<h1>{name || "Untitled Project"}</h1>
			<div className="visualizer">
				{initialImage && (
					<div className="image-container">
						<h2>Source Image</h2>
						<img src={initialImage} alt="source" />
					</div>
				)}
			</div>
		</section>
	);
};

export default VisualizerId;
