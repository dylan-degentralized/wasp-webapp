import { redirect, type Load } from "@sveltejs/kit"
import { getPost } from "$lib/backend/data"

export const load: Load = async ({ params, data }) => {
	const { slug } = params
	if (!slug) throw redirect(300, "/tutorials")

	const post = await getPost(slug)
	if (!post) throw redirect(300, "/tutorials")

	if (!data) throw redirect(300, "/tutorials/" + slug)
	const { form } = data

	return { post, form }
}
