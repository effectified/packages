// A Motion animation as an Effect UI mount on an element: the element animates to the view's keyframes when it is
// committed, animates again from where it is when the view gives other keyframes or options, reports when an
// animation completes, and stops with the element. Written for the engine's recipe (ui.mounts), not generated.
import { animate, type AnimationOptions, type AnimationPlaybackControlsWithThen, type DOMKeyframesDefinition } from "motion";
import { Schema } from "effect";
import { instanceMount, typed } from "../internal/ui.ts";

/** An animation of the element ran to its end: sent once per animation, never for one the next one interrupted. */
export interface AnimateFinished {
	readonly finished: true;
}

/** The element's animation running now, and who hears that it completed. */
interface Animating {
	readonly element: Element;
	animation: AnimationPlaybackControlsWithThen;
	finished: () => void;
}

/** `h.div.onMount(AnimateMount({ keyframes: { x: 100 }, options: { duration: 0.3 } }).pipe(Mount.map(() => Message.Arrived())))` */
export const AnimateMount = instanceMount(
	"Animate",
	{ args: { keyframes: typed<DOMKeyframesDefinition>(), options: Schema.optional(typed<AnimationOptions>()) } },
	{
		create: (element: Element, { keyframes, options }) => {
			const animating: Animating = { element, animation: animate(element, keyframes, options), finished: () => {} };
			settle(animating);
			return animating;
		},
		update: (animating, next) => {
			// Motion starts from the element's current values and stops the running animation of each: no snap.
			animating.animation = animate(animating.element, next.keyframes, next.options);
			settle(animating);
		},
		release: (animating) => animating.animation.stop(),
		events: (animating, emit: (finished: AnimateFinished) => void) => {
			animating.finished = () => emit({ finished: true });
			return () => {
				animating.finished = () => {};
			};
		},
	},
);

/** Reports the running animation's completion, unless the view has asked for another by the time it settles. */
function settle(animating: Animating): void {
	const animation = animating.animation;
	animation.then(
		() => {
			// Motion never settles an animation it interrupted, but one of values the next leaves alone (opacity,
			// then only x) runs on and completes: it is not the animation the view gives now.
			if (animating.animation === animation) animating.finished();
		},
		// A rejected animation did not complete, and an unhandled rejection is a page error.
		() => {},
	);
}
