// Motion's `inView` as an Effect UI mount on an element: it reports each time the element enters or leaves the
// viewport, and its observer is removed with the element. Written for the engine's recipe (ui.mounts), not generated.
//
// Built with `Mount.makeStream`, not `instanceMount`: `inView` is a subscription, not an instance. It gives back only
// its stop function, and its callbacks and `amount` are fixed when it starts, so there is nothing to update in place
// and nothing for `events` to attach to. One observer per args (`switchMap`) says that directly: another `amount`
// removes the observer and starts a new one, which reports the element's state again.
import { Mount } from "@effect/ui";
import { Effect, Queue, Schema, Stream } from "effect";
import { inView } from "motion";
import { typed } from "../internal/ui.ts";

/** Whether the element is in the viewport now, by the mount's `amount`. */
export interface InViewChange {
	readonly inView: boolean;
}

// Motion does not export `InViewOptions`: its `amount` is read from `inView`'s own signature.
type Amount = NonNullable<Parameters<typeof inView>[2]>["amount"];

/** `h.section.onMount(InViewMount({ amount: 0.5 }).pipe(Mount.map(({ inView }) => Message.Viewed({ inView }))))` */
export const InViewMount = Mount.makeStream("InView", { args: { amount: Schema.optional(typed<Amount>()) } }, (element: Element, _args, changes) =>
	changes.pipe(
		Stream.switchMap(({ amount }) =>
			Stream.callback<InViewChange>((queue) =>
				Effect.acquireRelease(
					Effect.sync(() =>
						inView(
							element,
							() => {
								Queue.offerUnsafe(queue, { inView: true });
								return () => {
									Queue.offerUnsafe(queue, { inView: false });
								};
							},
							{ amount },
						),
					),
					(stop) => Effect.sync(stop),
				),
			),
		),
	),
);
