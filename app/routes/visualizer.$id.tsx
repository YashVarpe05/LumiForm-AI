import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import puter from "@heyputer/puter.js";
import { generate3dView } from "lib/ai.action";
import { Box, Download, RefreshCcw, Share2, X } from "lucide-react";
import Button from "components/ui/Button";

const VisualizerId = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();

	const [projectName, setProjectName] = useState<string>(
		location.state?.name || "Untitled Project",
	);
	const [sourceImage, setSourceImage] = useState<string | null>(null);
	const [currentImage, setCurrentImage] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const hasTriggeredGeneration = useRef(false);

	const handleBack = () => navigate("/");

	// Load project data from KV / localStorage
	useEffect(() => {
		const loadProject = async () => {
			if (!id) {
				setIsLoading(false);
				return;
			}

			// Try Puter KV first
			try {
				const kvData = await puter.kv.get(`project:${id}`);
				if (kvData) {
					const parsed = JSON.parse(kvData as string) as DesignItem;
					setSourceImage(parsed.sourceImage);
					setProjectName((prev) =>
						prev === "Untitled Project" && parsed.name
							? parsed.name
							: prev,
					);
					if (parsed.renderedImage) {
						setCurrentImage(parsed.renderedImage);
					}
					setIsLoading(false);
					return;
				}
			} catch (e) {
				console.warn("Failed to fetch project from KV:", e);
			}

			// Fallback to localStorage
			const localImage = localStorage.getItem(`visualizer:image:${id}`);
			if (localImage) {
				setSourceImage(localImage);
				setProjectName((prev) =>
					prev === "Untitled Project" ? `Residence ${id}` : prev,
				);
			}
			setIsLoading(false);
		};

		loadProject();
	}, [id]);

	// Trigger generation once we have the source image
	useEffect(() => {
		if (!sourceImage || hasTriggeredGeneration.current || currentImage) return;
		hasTriggeredGeneration.current = true;

		const runGeneration = async () => {
			try {
				setIsProcessing(true);
				const result = await generate3dView({ sourceImage });
				if (result.renderedImage) {
					setCurrentImage(result.renderedImage);
				}
			} catch (e) {
				console.warn("Failed to generate 3d view:", e);
			} finally {
				setIsProcessing(false);
			}
		};

		runGeneration();
	}, [sourceImage, currentImage]);

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
							<h2>{projectName}</h2>
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
								{sourceImage && (
									<img
										src={sourceImage}
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

