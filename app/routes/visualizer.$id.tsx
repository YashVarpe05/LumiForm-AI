import React, { useEffect, useRef, useState } from "react";
import {
	useLocation,
	useNavigate,
	useOutletContext,
	useParams,
} from "react-router";
import puter from "@heyputer/puter.js";
import { generate3dView } from "lib/ai.action";
import { Box, Download, RefreshCcw, Share2, X } from "lucide-react";
import Button from "components/ui/Button";
import { createProject, getProjectById } from "lib/puter.action";

const VisualizerId = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const { userId } = useOutletContext<AuthContext>();
	const [projectName, setProjectName] = useState<string>(
		location.state?.name || "Untitled Project",
	);
	const [project, setProject] = useState<DesignItem | null>(null);
	const [isProjectLoading, setIsProjectLoading] = useState(true);
	const [sourceImage, setSourceImage] = useState<string | null>(null);
	const [currentImage, setCurrentImage] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const hasTriggeredGeneration = useRef(false);

	const handleBack = () => navigate("/");

	// 1. Initial Load: Fetch project by ID from Puter Worker
	useEffect(() => {
		let isMounted = true;
		const loadData = async () => {
			if (!id) {
				setIsProjectLoading(false);
				setIsLoading(false);
				return;
			}

			setIsProjectLoading(true);
			setIsLoading(true);

			try {
				// Use the centralized action to fetch from worker
				const fetchedProject = await getProjectById({ id });

				if (!isMounted) return;

				if (fetchedProject) {
					setProject(fetchedProject);
					setProjectName(fetchedProject.name || `Residence ${id}`);
					setSourceImage(fetchedProject.sourceImage);
					if (fetchedProject.renderedImage) {
						setCurrentImage(fetchedProject.renderedImage);
					}
				} else {
					// Fallback to localStorage if worker returns null (e.g., project not synced yet)
					const localImage = localStorage.getItem(`visualizer:image:${id}`);
					if (localImage) {
						setSourceImage(localImage);
						setProjectName(`Residence ${id}`);
					}
				}
			} catch (e) {
				console.error("Failed to load project:", e);
			} finally {
				if (isMounted) {
					setIsProjectLoading(false);
					setIsLoading(false);
				}
			}
		};

		loadData();
		return () => {
			isMounted = false;
		};
	}, [id]);

	const runGeneration = async (item: DesignItem) => {
		if (!id || !item.sourceImage || isProcessing) return;
		try {
			setIsProcessing(true);
			const result = await generate3dView({ sourceImage: item.sourceImage });
			if (result.renderedImage) {
				setCurrentImage(result.renderedImage);
				const updatedItem: DesignItem = {
					...item,
					renderedImage: result.renderedImage,
					renderedPath: result.renderedPath,
					timestamp: Date.now(),
					ownerId: item.ownerId ?? userId ?? null,
					isPublic: item.isPublic ?? false,
				};
				const saved = await createProject({ item: updatedItem });
				if (saved) {
					setProject(saved);
					setCurrentImage(saved.renderedImage || result.renderedImage);
				}
			}
		} catch (e) {
			console.warn("Failed to generate 3d view:", e);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleRegenerate = async () => {
		if (!sourceImage) return;
		try {
			setIsProcessing(true);
			const result = await generate3dView({ sourceImage });
			if (result.renderedImage) {
				setCurrentImage(result.renderedImage);
			}
		} catch (e) {
			console.warn("Failed to regenerate:", e);
		} finally {
			setIsProcessing(false);
		}
	};

	// 2. Generation Trigger: Run once the project/source is loaded if no render exists
	useEffect(() => {
		if (
			isProjectLoading ||
			isLoading ||
			hasTriggeredGeneration.current ||
			currentImage
		)
			return;

		if (project) {
			hasTriggeredGeneration.current = true;
			void runGeneration(project);
		} else if (sourceImage && id) {
			// If we only have sourceImage (from localStorage), create a temp item
			const tempItem: DesignItem = {
				id,
				sourceImage,
				timestamp: Date.now(),
				name: projectName,
			};
			hasTriggeredGeneration.current = true;
			void runGeneration(tempItem);
		}
	}, [project, sourceImage, id, isProjectLoading, isLoading, currentImage]);

	return (
		<div className="visualizer">
			<nav className="topbar">
				<div className="brand">
					<Box className="logo" />
					<span className="name">Lumiform</span>
				</div>
				<Button variant="ghost" size="sm" onClick={handleBack} className="exit">
					<X className="icon" /> Exit Editor
				</Button>
			</nav>
			<section className="content">
				<div className="panel">
					<div className="panel-header">
						<div className="panel-meta">
							<p>Project</p>
							<h2>{project?.name || `Residence ${id}`}</h2>
							<p className="note">Created by you</p>
						</div>
						<div className="panel-actions">
							<Button
								size="sm"
								onClick={handleRegenerate}
								className="export"
								disabled={!sourceImage || isProcessing}
							>
								<RefreshCcw className="w-4 h-4 mr-2" />
								Regenerate
							</Button>
							<Button
								size="sm"
								onClick={() => {}}
								className="export"
								disabled={!currentImage}
							>
								<Download className="w-4 h-4 mr-2" />
								Export
							</Button>
							<Button size="sm" onClick={() => {}} className="share">
								<Share2 className="w-4 h-4 mr-2" />
								Share
							</Button>
						</div>
					</div>
					<div className={`render-area ${isProcessing ? "is-processing" : ""}`}>
						{isLoading ? (
							<div className="render-placeholder">
								<span>Loading project…</span>
							</div>
						) : currentImage ? (
							<img src={currentImage} alt="AI Render" className="render-img" />
						) : (
							<div className="render-placeholder">
								{project?.sourceImage && (
									<img
										src={project?.sourceImage}
										alt="Original"
										className="render-fallback"
									/>
								)}
							</div>
						)}
						{isProcessing && (
							<div className="render-overlay">
								<div className="rendering-card">
									<RefreshCcw className="spinner" />
									<span className="title">Rendering...</span>
									<span className="subtitle">
										Generating your 3D visualization
									</span>
								</div>
							</div>
						)}
					</div>
				</div>
			</section>
		</div>
	);
};

export default VisualizerId;
