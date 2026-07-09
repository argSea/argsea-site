// The Light List entry: the overlay shared by the coast (LightsBoard) and
// the home preview (HomeLights). A self-contained modal: it owns Escape,
// the backdrop click, the scroll lock, and the open-focus move itself, so
// neither caller has to wire that up twice. The harbor cat perches on the
// card's top edge only when the page's one-cat pick landed on this overlay
// spot (the caller decides and passes catHere).
import { useEffect, useRef, useState } from 'react';
import type { FigureheadDesign, Light, Project } from '../../lib/api';
import { DEFAULT_LIGHT, codeFor, decodeFor, glowFor, registryNo, timeline } from '../../lib/lightChar';
import { mediaUrl } from '../../lib/media';
import { useLamp } from './useLamp';
import { useEscapeKey } from './useEscapeKey';
import HarborCat from './HarborCat';
import './LightEntryOverlay.css';

interface Props {
	project:     Project;
	catHere?:    boolean;
	catDesigns?: FigureheadDesign[];
	onClose:     () => void;
}

export default function LightEntryOverlay({ project, catHere = false, catDesigns, onClose }: Props) {
	const light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const glow = glowFor(light);

	const haloRef = useLamp(light, dark ? 0.05 : 0.5);
	const coreRef = useLamp(light, dark ? 0.18 : 0.9);

	const closeRef = useRef<HTMLButtonElement>(null);
	const [photoIndex, setPhotoIndex] = useState(0);

	useEscapeKey(true, onClose);

	useEffect(() => {
		closeRef.current?.focus();
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = previousOverflow; };
	}, []);

	const gallery = project.images && project.images.length
		? project.images
		: project.image ? [project.image] : [];

	return (
		<div className="overlay-backdrop" onClick={onClose}>
			<div className="light-entry-wrap" onClick={(event) => event.stopPropagation()}>
				{catHere && <div className="cat-mount cat-mount--light-entry"><HarborCat pose="perched" context="postcard" designs={catDesigns} /></div>}
				<div className="overlay-card light-entry">
					<div className="overlay-head">
						<span className="overlay-kicker">Light List · argsea district · No. {registryNo(project.order)}</span>
						<button ref={closeRef} className="pill-close" onClick={onClose}>close ✕</button>
					</div>

					<div className="light-entry__body">
						<div className="light-entry__masthead">
							<div className="lamp lamp--big">
								<div className="lamp__halo-under" style={{ background: `radial-gradient(circle, rgba(${glow},${dark ? 0.05 : 0.16}) 0%, transparent 70%)` }} />
								<div ref={haloRef} className="lamp__halo" style={{ background: `radial-gradient(circle, rgba(${glow},1) 0%, transparent 62%)` }} />
								<svg className="lamp__ghost" width="40" height="54" viewBox="0 0 26 34" fill="none">
									<path d="M13 3 L17 10 L9 10 Z" fill="rgba(150,160,220,.4)" />
									<rect x="10" y="10" width="6" height="15" fill="none" stroke="rgba(150,160,220,.45)" strokeWidth="1.3" />
									<path d="M10 14 h6 M10 19 h6" stroke="rgba(150,160,220,.34)" strokeWidth="1.1" />
									<path d="M5 30 q8 -4 16 0" stroke="rgba(150,160,220,.36)" strokeWidth="1.3" fill="none" />
								</svg>
								<div
									ref={coreRef}
									className="lamp__core"
									style={{ background: dark ? '#59647f' : '#fff', boxShadow: `0 0 13px 4px rgba(${glow},1)` }}
								/>
							</div>
							<div className="light-entry__intro">
								<span className="light-entry__title">{project.title}</span>
								<div className="light-entry__status-row">
									<span className={`status-pill ${dark ? 'status-pill--dark' : 'status-pill--lit'}`}>{dark ? `dark · ${light.extinguished}` : 'lit'}</span>
									<span className="light-entry__code">{codeFor(light)}</span>
								</div>
								<span className="light-entry__decoded">{decodeFor(light)}</span>
								<TimingDiagram light={light} glow={glow} />
							</div>
						</div>

						<div className="light-entry__meta">
							<span>first lit · <span className="light-entry__meta-value">{project.firstLit}</span></span>
							<span>district · <span className="light-entry__meta-value">argsea</span></span>
							<span>keeper · <span className="light-entry__meta-value">j</span></span>
						</div>

						<div className="light-entry__cols">
							<div className="light-entry__left">
								{/* body is sanitized HTML from the API; rendered as-is by contract */}
								<div className="light-entry__text" dangerouslySetInnerHTML={{ __html: project.body }} />
							</div>

							{gallery.length > 0 && (
								<div className="light-entry__right">
									<div className="photo-print">
										<img src={mediaUrl(gallery[photoIndex])} alt={project.title} />
									</div>
									<span className="light-entry__photo-caption">from the station archive</span>
									{gallery.length > 1 && (
										<div className="light-entry__thumbs">
											{gallery.map((name, index) => (
												<button
													key={name}
													className={`light-entry__thumb${index === photoIndex ? ' light-entry__thumb--active' : ''}`}
													onClick={() => setPhotoIndex(index)}
												>
													<img src={mediaUrl(name)} alt="" />
												</button>
											))}
										</div>
									)}
								</div>
							)}
						</div>

						<div className="light-entry__moral">{project.moral}</div>

						<div className="light-entry__footer">
							<span className="light-entry__tags">{(project.tags ?? []).join('  ·  ')}</span>
							<span className="light-entry__signoff">- j, keeper</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * A static one-period strip of the light's real lit/dark pattern, built off
 * the same timeline() the characteristic engine animates from: a flash reads
 * as one wide bar, morse as its dots and dashes. Fixed, extinguished, and
 * anything with no spans have nothing worth drawing, so they render nothing.
 */
function TimingDiagram({ light, glow }: { light: Light; glow: string }) {
	if (light.extinguished || light.kind === 'fixed') {
		return null;
	}
	const { period, spans } = timeline(light);
	if (!(period > 0) || spans.length === 0) {
		return null;
	}
	return (
		<div className="light-entry__timing" aria-hidden="true">
			{spans.map(([start, end], index) => (
				<span
					key={index}
					className="light-entry__timing-lit"
					style={{ left: `${(start / period) * 100}%`, width: `${((end - start) / period) * 100}%`, background: `rgb(${glow})` }}
				/>
			))}
		</div>
	);
}
