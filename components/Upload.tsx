import { CheckCircle2, ImageIcon, UploadIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router";
import {
	PROGRESS_INTERVAL_MS,
	PROGRESS_STEP,
	REDIRECT_DELAY_MS,
	MAX_FILE_SIZE_BYTES,
	MAX_FILE_SIZE_MB,
} from "lib/constants";

type UploadProps = {
	onComplete?: (base64Data: string) => void;
};

const Upload = ({ onComplete }: UploadProps) => {
	const [file, setFile] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const progressIntervalRef = useRef<number | null>(null);
	const completeTimeoutRef = useRef<number | null>(null);

	const { isSignedIn } = useOutletContext<AuthContext>();

	const clearTimers = () => {
		if (progressIntervalRef.current) {
			window.clearInterval(progressIntervalRef.current);
			progressIntervalRef.current = null;
		}

		if (completeTimeoutRef.current) {
			window.clearTimeout(completeTimeoutRef.current);
			completeTimeoutRef.current = null;
		}
	};

	useEffect(() => {
		return () => {
			clearTimers();
		};
	}, []);

	const processFile = (selectedFile: File) => {
		if (!isSignedIn) return;

		const processFile = (selectedFile: File) => {
			if (!isSignedIn) return;

			clearTimers();

			if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
				setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
				setFile(null);
				setProgress(0);
				return;
			}

			setError(null);
			setFile(selectedFile);		setFile(selectedFile);
		setProgress(0);

		const base64Promise = new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				if (typeof reader.result !== "string") {
					reject(new Error("Failed to read file as base64"));
					return;
				}

				const data = reader.result.includes(",")
					? reader.result.split(",")[1]
					: reader.result;
				resolve(data);
			};
			reader.onerror = () => reject(new Error("FileReader error"));
			reader.readAsDataURL(selectedFile);
		});

		progressIntervalRef.current = window.setInterval(() => {
			setProgress((currentProgress) => {
				const nextProgress = Math.min(currentProgress + PROGRESS_STEP, 100);

				if (nextProgress === 100) {
					if (progressIntervalRef.current) {
						window.clearInterval(progressIntervalRef.current);
						progressIntervalRef.current = null;
					}

					base64Promise
						.then((base64Data) => {
							completeTimeoutRef.current = window.setTimeout(() => {
								onComplete?.(base64Data);
							}, REDIRECT_DELAY_MS);
						})
						.catch(() => {
							setFile(null);
							setProgress(0);
						});
				}

				return nextProgress;
			});
		}, PROGRESS_INTERVAL_MS);
	};

	const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		if (!isSignedIn) return;
		setIsDragging(true);
	};

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		if (!isSignedIn) return;
		setIsDragging(true);
	};

	const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		if (!isSignedIn) return;
		setIsDragging(false);
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		if (!isSignedIn) return;

		setIsDragging(false);
		setError(null);
		const droppedFiles = event.dataTransfer.files;
		if (droppedFiles.length > 0) {
			processFile(droppedFiles[0]);
		}
	};

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (!isSignedIn) return;

		setError(null);
		const selectedFiles = event.target.files;
		if (selectedFiles && selectedFiles.length > 0) {
			processFile(selectedFiles[0]);
		}
	};

	return (
		<div className="upload">
			{!file ? (
				<div
					className={`dropzone ${isDragging ? "is-dragging" : ""}`}
					onDragEnter={handleDragEnter}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					<input
						type="file"
						className="drop-input"
						accept=".jpg,.jpeg,.png"
						disabled={!isSignedIn}
						onChange={handleChange}
					/>
					<div className="drop-content">
						<div className="drop-icon">
							<UploadIcon size={20} />
						</div>
						<p>
							{isSignedIn
								? "Click to upload or just drag and drop"
								: "Sign in or sign up with Puter to upload"}
						</p>
						{error ? (
							<p className="help" style={{ color: "#ef4444", fontWeight: "600" }}>
								{error}
							</p>
						) : (
							<p className="help">Maximum file size {MAX_FILE_SIZE_MB} MB.</p>
						)}
					</div>
				</div>
			) : (
				<div className={`upload-status ${progress === 100 ? "is-complete" : ""}`}>
					<div className="status-content">
						<div className="status-icon">
							{progress === 100 ? (
								<CheckCircle2 className="check" />
							) : (
								<ImageIcon className="image" />
							)}
						</div>
						<h3 title={file.name}>{file.name}</h3>
						<div className="progress">
							<div className="bar" style={{ width: `${progress}%` }} />
						</div>
						<p className="status-text">
							{progress < 100 ? "Analyzing" : "Redirecting..."}
						</p>
					</div>
				</div>
			)}
		</div>
	);
};

export default Upload;
