import type { SupabaseClient } from "@supabase/supabase-js"
import { encodeSEO } from "$lib/utils"
import type { DeveloperWithUsername, IScriptCard, TutorialWithAuthor } from "$lib/types/collection"

const website = "https://waspscripts.com"

const loadScripts = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from("scripts_public")
		.select(`title,	scripts_protected ( profiles_public (username, avatar_url) )`)
		.order("title", { ascending: true })
		.returns<IScriptCard[]>()

	if (error) return console.error("scripts_public SELECT failed:" + error.message)

	const scriptData = data

	let result: string[] = []
	scriptData.forEach((script) => {
		result.push(
			encodeSEO(script.title + " by " + script.scripts_protected.profiles_public.username)
		)
	})

	return result
}

const loadTutorials = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from("tutorials")
		.select("title, profiles_public (username, avatar_url)")
		.returns<TutorialWithAuthor[]>()

	if (error) return console.error("tutorials SELECT failed: " + error.message)

	let result: string[] = []
	data.forEach((tutorial) => {
		result.push(encodeSEO(tutorial.title + " by " + tutorial.profiles_public.username))
	})

	return result
}

const loadDevelopers = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from("developers")
		.select("profiles_public (username, avatar_url)")
		.returns<DeveloperWithUsername[]>()

	if (error) return console.error("developers SELECT failed: " + error.message)

	let result: string[] = []
	data.forEach((developer) => {
		result.push(encodeSEO(developer.profiles_public.username))
	})

	return result
}

const buildLoc = async (supabase: SupabaseClient, loc: string) => {
	let data: string[] = []
	if (loc === "scripts") {
		data = (await loadScripts(supabase)) as string[]
	} else if (loc === "tutorials") {
		data = (await loadTutorials(supabase)) || []
	} else {
		data = (await loadDevelopers(supabase)) || []
	}

	let result: string = ""

	data.forEach((el) => {
		result += `
      <url>
        <loc>${website}/${loc}/${el}</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
      </url>
`
	})

	return result
}

export const GET = async ({ locals: { supabaseServer } }) => {
	const scripts = await buildLoc(supabaseServer, "scripts")
	const tutorials = await buildLoc(supabaseServer, "tutorials")
	const developers = await buildLoc(supabaseServer, "developers")

	const headers = {
		"Cache-Control": "max-age=0, s-maxage=3600",
		"Content-Type": "application/xml"
	}
	return new Response(
		`<?xml version="1.0" encoding="UTF-8" ?>
    <urlset
      xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
      xmlns:xhtml="https://www.w3.org/1999/xhtml"
      xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
      xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
      xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
    >
      <url>
        <loc>${website}</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
      </url>
      <url>
        <loc>${website}/setup</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
      </url>
      <url>
        <loc>${website}/scripts</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
      </url>
      ${scripts}
      <url>
        <loc>${website}/stats</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
      </url>
      <url>
        <loc>${website}/premium</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
      </url>      
      <url>
        <loc>${website}/faq</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
      </url>     
      <url>
        <loc>${website}/tutorials</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
      </url>
      ${tutorials}
      <url>
        <loc>${website}/developers</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
      </url>
      ${developers}
    </urlset>`,
		{ headers: headers }
	)
}
