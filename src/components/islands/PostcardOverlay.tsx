// The back of the postcard — the project overlay shared by the Projects grid
// and the homepage preview. The homepage variant adds a "see all projects →"
// link under the moral (updated Hello design). No stamp back here: stamps
// live on the card fronts only (design v4). The harbor cat perches on the
// card's top edge only when the page's one-cat pick landed on this overlay
// spot (the caller decides and passes catHere).
import type { Project } from '../../lib/api';
import { mediaUrl } from '../../lib/media';
import HarborCat from './HarborCat';
import './PostcardOverlay.css';

interface Props {
	project:     Project;
	showSeeAll?: boolean;
	catHere?:    boolean;
	onClose:     () => void;
}

export default function PostcardOverlay({ project, showSeeAll = false, catHere = false, onClose }: Props) {
	return (
		<div className="overlay-backdrop" onClick={onClose}>
			<div className="postcard-back-wrap" onClick={(event) => event.stopPropagation()}>
				{catHere && <div className="cat-mount cat-mount--postcard"><HarborCat pose="perched" context="postcard" /></div>}
				<div className="overlay-card postcard-back">
					<div className="overlay-head">
						<span className="overlay-kicker">Postcard · from production</span>
						<button className="pill-close" onClick={onClose}>close ✕</button>
					</div>
					<div className="postcard-back__cols">
						<div className="postcard-back__left">
							<div className="postcard-back__title">{project.title}</div>
							{/* body is sanitized HTML from the API — rendered as-is by contract */}
							<div className="postcard-back__body" dangerouslySetInnerHTML={{ __html: project.body }} />
							<div className="postcard-back__moral">{project.moral}</div>
							{showSeeAll && <a className="postcard-back__see-all" href="/projects">see all projects →</a>}
						</div>
						<div className="postcard-back__right">
							<div className="photo-print">
								{project.image
									? <img src={mediaUrl(project.image)} alt={project.title} />
									: <div className="photo-print__blank" />}
							</div>
							<div className="address-block">
								<span className="address-block__label">to:</span>
								<span className="address-block__value">{project.postcardTo}</span>
								<span className="address-block__label address-block__label--spaced">from:</span>
								<span className="address-block__value">{project.postcardFrom}</span>
								<span className="address-block__label address-block__label--spaced">postmarked:</span>
								<span className="address-block__value">{project.postmarked}</span>
							</div>
							<div className="postcard-back__tags">{project.tags.join('  ·  ')}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
