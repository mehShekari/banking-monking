# Examples

Copy these shapes. Rename `widgets` / `Widgets` to the domain. Import groups: npm → `@repo` → `@/` → relative.

If this repo already prefixes hooks (`useWebsiteX`) or query keys (`queryKeys.website`), match that — do not invent a second style.

Locales in snippets use `routing.defaultLocale`. Swap `fa`/`en`/`ar` for the product's list.

## Thin locale route (live data + hydrate)

`src/app/[locale]/widgets/page.tsx`

```tsx
import QueryHydrationBoundary from "@repo/system/providers/query-hydration";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { buildPageMetadataFromParams } from "@/i18n/buildPageMetadataFromParams";
import { localeUrl } from "@/i18n/metadata";
import { routing } from "@/i18n/routing";
import WidgetsPage from "@/modules/widgets/pages/WidgetsPage";
import { loadWidgetsPageSeed } from "@/modules/widgets/server";
import Breadcrumb from "@/shared/seo/Breadcrumb";

import type { AppLocale } from "@repo/system/http/types";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	return buildPageMetadataFromParams(params, {
		pathname: "/widgets",
		namespace: "widgets.metadata",
	});
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
	const { locale: requested } = await params;
	const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
	setRequestLocale(locale);
	const c = await getTranslations({ locale, namespace: "common" });
	const seed = await loadWidgetsPageSeed(locale as AppLocale);

	return (
		<>
			<Breadcrumb
				items={[
					{ name: c("breadcrumb.home"), url: localeUrl(locale, "/") },
					{ name: c("breadcrumb.widgets"), url: localeUrl(locale, "/widgets") },
				]}
			/>
			<QueryHydrationBoundary state={seed.dehydratedState}>
				<WidgetsPage />
			</QueryHydrationBoundary>
		</>
	);
}
```

## Thin locale route (static)

No hydration — module page loads data itself:

```tsx
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { buildPageMetadataFromParams } from "@/i18n/buildPageMetadataFromParams";
import { localeUrl } from "@/i18n/metadata";
import { routing } from "@/i18n/routing";
import { AboutPage } from "@/modules/about";
import Breadcrumb from "@/shared/seo/Breadcrumb";

import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	return buildPageMetadataFromParams(params, {
		pathname: "/about",
		namespace: "about.metadata",
	});
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
	const { locale: requested } = await params;
	const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
	setRequestLocale(locale);
	const c = await getTranslations({ locale, namespace: "common" });

	return (
		<>
			<Breadcrumb
				items={[
					{ name: c("breadcrumb.home"), url: localeUrl(locale, "/") },
					{ name: c("breadcrumb.about"), url: localeUrl(locale, "/about") },
				]}
			/>
			<AboutPage />
		</>
	);
}
```

## `loading.tsx` + `error.tsx`

```tsx
// src/app/[locale]/widgets/loading.tsx
import { Container } from "@/components/layout";
import RouteBreadcrumbSkeleton from "@/components/SystemPage/RouteBreadcrumbSkeleton";
import { WidgetsSectionSkeleton } from "@/modules/widgets";

export default function WidgetsLoading() {
	return (
		<Container className="mt-8 px-6 pb-16" aria-busy="true">
			<RouteBreadcrumbSkeleton />
			<WidgetsSectionSkeleton />
		</Container>
	);
}
```

```tsx
// src/app/[locale]/widgets/error.tsx
"use client";

export { default } from "@/components/SystemPage/PublicRouteError";
```

Use this repo's shared error/skeleton names if they differ.

## Module barrel (client-safe)

`src/modules/widgets/index.ts`

```ts
/**
 * Widgets module — public client-safe surface.
 *
 * Server loaders live in `@/modules/widgets/server` (server-only).
 */

export { fetchWidgetsClient } from "./api/widgetsClient";
export { WIDGETS_HYDRATED_QUERY_OPTIONS } from "./constants/queryOptions";
export * from "./hooks/useWidgets";
export { default as WidgetsSectionSkeleton } from "./components/WidgetsSectionSkeleton";
```

Do **not** `export * from "./server"`.

`src/modules/widgets/server/index.ts`

```ts
import "server-only";

export { loadWidgetsPageSeed } from "./loadWidgetsPageSeed";
```

## Module page (Server Component)

```tsx
import { getTranslations } from "next-intl/server";

import Breadcrumb from "@/components/Breadcrumb";
import { Container } from "@/components/layout";
import WidgetsSection from "@/modules/widgets/components/WidgetsSection";

export default async function WidgetsPage() {
	const c = await getTranslations("common");
	const t = await getTranslations("widgets.metadata");

	return (
		<Container className="mt-8 px-6 pb-16">
			<Breadcrumb
				embedded
				ariaLabel={c("breadcrumb.navAriaLabel")}
				items={[{ label: c("breadcrumb.home"), href: "/" }, { label: c("breadcrumb.widgets") }]}
			/>
			<h1 className="sr-only">{t("title")}</h1>
			<WidgetsSection />
		</Container>
	);
}
```

Static pages compose sections and call `loadAboutPageData` inside the module page.

## Server seed

`src/modules/widgets/server/loadWidgetsPageSeed.ts`

```ts
import "server-only";

import { queryKeys } from "@repo/system/query/keys";
import { getQueryClient } from "@repo/system/query/server/get-query-client";
import { fetchWidgets } from "@repo/system/query/widgets-api";
import { type DehydratedState, dehydrate } from "@tanstack/react-query";

import { WIDGETS_HYDRATED_QUERY_OPTIONS } from "@/modules/widgets/constants/queryOptions";

import type { AppLocale } from "@repo/system/http/types";

export type WidgetsPageSeed = {
	dehydratedState: DehydratedState;
};

export async function loadWidgetsPageSeed(locale: AppLocale): Promise<WidgetsPageSeed> {
	const queryClient = getQueryClient();

	try {
		await queryClient.prefetchQuery({
			queryKey: queryKeys.widgets.list(locale),
			queryFn: () => fetchWidgets(locale),
			...WIDGETS_HYDRATED_QUERY_OPTIONS,
		});
	} catch (error) {
		console.error("Widgets page seed prefetch failed:", error);
	}

	return { dehydratedState: dehydrate(queryClient) };
}
```

Hydrated options:

```ts
export const WIDGETS_HYDRATED_QUERY_OPTIONS = {
	staleTime: Number.POSITIVE_INFINITY,
	gcTime: 30 * 60 * 1000,
	refetchOnMount: false,
	refetchOnWindowFocus: false,
} as const;
```

## Client fetcher (BFF only)

```ts
import { parseBffResponse, widgetsResponseSchema } from "@repo/system/http/bff-schemas";
import { ApiError } from "@repo/system/http/client";

import type { AppLocale } from "@repo/system/http/types";
import type { Widget } from "@repo/system/query/widgets-api";

export async function fetchWidgetsClient(locale: AppLocale): Promise<Widget[]> {
	const url = new URL("/api/widgets", typeof window !== "undefined" ? window.location.origin : "http://localhost");
	url.searchParams.set("locale", locale);

	const response = await fetch(url.toString(), {
		method: "GET",
		headers: { Accept: "application/json" },
		cache: "no-store",
	});

	const text = await response.text();
	const body: unknown = text ? JSON.parse(text) : undefined;

	if (!response.ok) {
		const err = (body ?? {}) as { code?: number; message?: string };
		throw new ApiError("error", err.code ?? response.status, err.message);
	}

	return parseBffResponse(widgetsResponseSchema, body) as Widget[];
}
```

Never pass `NEXT_PUBLIC_*_API_URL` / gateway URL into the browser fetcher. If this repo names the error class `GatewayApiError`, keep that name.

## Query hook

```ts
"use client";

import { queryKeys } from "@repo/system/query/keys";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { fetchWidgetsClient } from "@/modules/widgets/api/widgetsClient";

import type { AppLocale } from "@repo/system/http/types";
import type { Widget } from "@repo/system/query/widgets-api";

export function useWidgets(options: Omit<UseQueryOptions<Widget[]>, "queryKey" | "queryFn"> = {}) {
	const locale = useLocale() as AppLocale;

	return useQuery({
		queryKey: queryKeys.widgets.list(locale),
		queryFn: () => fetchWidgetsClient(locale),
		...options,
	});
}
```

## BFF route

`src/app/api/widgets/route.ts`

```ts
import { fetchWidgets } from "@repo/system/query/widgets-api";

import { handleApiGet } from "@/app/api/_lib/handle-api-get";

import type { NextRequest } from "next/server";

/** GET /api/widgets — widget list (server-side upstream proxy). */
export async function GET(request: NextRequest) {
	return handleApiGet(request, (locale) => fetchWidgets(locale));
}
```

## Query UI + skeleton

```tsx
"use client";

import WidgetsSectionSkeleton from "@/modules/widgets/components/WidgetsSectionSkeleton";
import { WIDGETS_HYDRATED_QUERY_OPTIONS } from "@/modules/widgets/constants/queryOptions";
import { useWidgets } from "@/modules/widgets/hooks/useWidgets";
import QuerySectionState from "@/shared/query/QuerySectionState";

export default function WidgetsSection() {
	const query = useWidgets(WIDGETS_HYDRATED_QUERY_OPTIONS);

	return (
		<QuerySectionState
			isLoading={query.isLoading}
			isError={query.isError}
			isEmpty={!query.data?.length}
			error={query.error}
			onRetry={() => void query.refetch()}
			isRetrying={query.isFetching}
			loading={<WidgetsSectionSkeleton />}
		>
			<ul>{query.data?.map((item) => <li key={item.id}>{item.title}</li>)}</ul>
		</QuerySectionState>
	);
}
```

Skeleton is a **sibling file** used by both this `loading` slot and `app/.../loading.tsx`.

## i18n namespace

`src/i18n/messages/<locale>/widgets.json` — same keys in every locale:

```json
{
	"metadata": {
		"title": "Widgets",
		"description": "…"
	}
}
```

Add `"widgets"` to `NAMESPACES` in `src/i18n/request.ts`. Add `breadcrumb.widgets` under `common.json` for every locale.

## Grid + logical classes + cn

```tsx
import { cn } from "@repo/utils/cn";

import { Col, Container, Row } from "@/components/layout";

export default function Example({ className }: { className?: string }) {
	return (
		<Container className={cn("px-6 pb-16", className)}>
			<Row>
				<Col lg={8} xs={12} className="text-start pe-4">
					{/* main */}
				</Col>
				<Col lg={4} xs={12} className="mt-8 lg:mt-0">
					{/* side */}
				</Col>
			</Row>
		</Container>
	);
}
```

## Locale-aware link

```tsx
import { Link } from "@/i18n/navigation";

<Link href="/widgets">…</Link>
```

Not `next/link`.
