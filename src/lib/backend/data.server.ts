import { get } from "svelte/store"
import type { Script, ScriptPublic } from "./types"
import { supabaseStore } from "./auth"
import type { SupabaseClient } from "@supabase/supabase-js"
import { pad } from "$lib/utils"

function updateID(str: string, id: string) {
	const regex = /{\$UNDEF SCRIPT_ID}{\$DEFINE SCRIPT_ID := '(.*?)'}/
	const replace = "{$UNDEF SCRIPT_ID}{$DEFINE SCRIPT_ID := '" + id + "'}"
	str = str.match(regex) ? str.replace(regex, replace) : replace.concat("\n").concat(str)

	return str
}

function updateRevision(str: string, rev: number) {
	const regex = /{\$UNDEF SCRIPT_REVISION}{\$DEFINE SCRIPT_REVISION := '(.*?)'}/
	const replace = "{$UNDEF SCRIPT_REVISION}{$DEFINE SCRIPT_REVISION := '" + rev.toString() + "'}"
	str = str.match(regex) ? str.replace(regex, replace) : replace.concat("\n").concat(str)

	return str
}

async function updateScriptFile(file: File, id: string, revision: number) {
	let fileString = await file.text()
	fileString = updateID(updateRevision(fileString, revision), id)

	return new File([fileString], file.name, { type: "text/plain" })
}

async function uploadFile(bucket: string, path: string, file: File) {
	const supabase = get(supabaseStore) as SupabaseClient
	const { error } = await supabase.storage.from(bucket).upload(path, file)

	if (error) console.error(error)
}

export async function uploadScript(
	script: ScriptPublic,
	file: File | undefined,
	coverFile: File | undefined,
	bannerFile: File | undefined
) {
	if (!file) {
		console.error("Script file is missing!")
		return { error: "Script file is missing!" }
	}

	if (!coverFile) {
		console.error("Cover image is missing!")
		return { error: "Cover image is missing!" }
	}

	if (!bannerFile) {
		console.error("Banner image is missing!")
		return { error: "Banner image is missing!" }
	}

	const supabase = get(supabaseStore) as SupabaseClient

	const publicData = {
		title: script.title,
		description: script.description,
		content: script.content,
		categories: script.categories,
		subcategories: script.subcategories,
		min_xp: script.min_xp,
		max_xp: script.max_xp,
		min_gp: script.min_gp,
		max_gp: script.max_gp
	}

	const { data, error } = await supabase.from("scripts_public").insert(publicData).select()
	if (error) {
		console.error(error)
		return { error: error.message }
	}

	script.id = data[0].id

	file = await updateScriptFile(file, script.id as string, 1)

	//rename all scripts to script so we can always fetch them later regardless of name changes.
	const path = script.id + "/" + pad(1, 9) + "/script.simba"

	uploadFile("scripts", path, file)
	uploadFile("imgs", "scripts/" + script.id + "/cover.jpg", coverFile)
	uploadFile("imgs", "scripts/" + script.id + "/banner.jpg", bannerFile)

	return { error: undefined }
}

export async function updateScript(
	script: Script,
	file: File | undefined,
	coverFile: File | undefined,
	bannerFile: File | undefined
) {
	const supabase = get(supabaseStore) as SupabaseClient

	const publicData = {
		title: script.title,
		description: script.description,
		content: script.content,
		categories: script.categories,
		subcategories: script.subcategories,
		min_xp: script.min_xp,
		max_xp: script.max_xp,
		min_gp: script.min_gp,
		max_gp: script.max_gp
	}

	const { error } = await supabase.from("scripts_public").update(publicData).eq("id", script.id)
	if (error) {
		console.error(error)
		return { error: error.message }
	}

	if (file) {
		const revision = script.scripts_protected.revision + 1
		file = await updateScriptFile(file, script.id as string, revision)
		const path = script.id + "/" + pad(revision, 9) + "/script.simba"
		uploadFile("scripts", path, file)
	}

	if (coverFile) uploadFile("imgs", "scripts/" + script.id + "/cover.jpg", coverFile)
	if (bannerFile) uploadFile("imgs", "scripts/" + script.id + "/banner.jpg", bannerFile)

	return { error: undefined }
}