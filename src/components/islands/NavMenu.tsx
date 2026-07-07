// The narrow-screen nav: a hamburger toggle and the menu panel it opens. The
// desktop links stay static in Nav.astro; this island only takes over below the
// hamburger breakpoint (CSS hides the burger and panel on desktop). The panel
// closes on a link tap, Escape, or a backdrop click, and returns focus to the
// toggle.
//
// The header cat is menu-gated here: when the page's one-cat pick is the header
// spot, the cat loafs on the active link inside the OPEN menu — it shows when
// the menu opens, the same fold-in as the overlay spots. On desktop the
// director rides the cat on the nav link instead, so it's never two.
import { useEffect, useRef, useState } from 'react';
import { pageCatPick, NAV_HAMBURGER_MAX, type CatPage } from '../../lib/catSpots';
import HarborCat from './HarborCat';
import { useEscapeKey } from './useEscapeKey';
import './NavMenu.css';

export interface NavLink {
	id:    string;
	label: string;
	href:  string;
}

interface Props {
	active:     string;
	page:       CatPage;
	links:      NavLink[];
	catEnabled: boolean;
	catPages?:  Record<string, boolean>;
	catSpots?:  Record<string, boolean>;
}

export default function NavMenu({ active, page, links, catEnabled, catPages, catSpots }: Props) {
	const [open, setOpen] = useState(false);
	const burger = useRef<HTMLButtonElement>(null);

	const close = () => setOpen(false);

	// Dismissals that don't land focus anywhere (Escape, backdrop) hand it back
	// to the toggle; a link tap navigates, so plain close is enough there
	const dismiss = () => {
		close();
		burger.current?.focus();
	};
	useEscapeKey(open, dismiss);

	// A jump to desktop width leaves no way to close the panel, so drop it
	useEffect(() => {
		const desktop = window.matchMedia(`(min-width: ${NAV_HAMBURGER_MAX + 1}px)`);
		const onChange = () => { if (desktop.matches) { setOpen(false); } };
		desktop.addEventListener('change', onChange);
		return () => desktop.removeEventListener('change', onChange);
	}, []);

	// The cat rides the open menu only when this page's pick is the header spot
	const pick = catEnabled ? pageCatPick(page, catPages, catSpots) : null;
	const menuCat = pick?.menuGated ? pick : null;

	return (
		<>
			<button
				ref={burger}
				className="nav-burger"
				aria-label={open ? 'close menu' : 'open menu'}
				aria-expanded={open}
				aria-controls="nav-menu"
				onClick={() => setOpen((prev) => !prev)}
			>
				<span className={`nav-burger__box${open ? ' nav-burger__box--open' : ''}`}>
					<span className="nav-burger__bar" />
					<span className="nav-burger__bar" />
					<span className="nav-burger__bar" />
				</span>
			</button>

			{open && (
				<>
					<div className="nav-backdrop" onClick={dismiss} />
					<nav id="nav-menu" className="nav-menu">
						{links.map((link) => {
							const isActive = active === link.id;
							return (
								<div key={link.id} className="nav-menu__item">
									{isActive && menuCat && (
										<div className="cat-mount cat-mount--menu">
											<HarborCat pose="lying" context="header" />
										</div>
									)}
									<a href={link.href} className={isActive ? 'active' : undefined} onClick={close}>{link.label}</a>
								</div>
							);
						})}
						<div className="nav-menu__item">
							<a href="/resume.pdf" onClick={close}>resume ↗</a>
						</div>
					</nav>
				</>
			)}
		</>
	);
}
