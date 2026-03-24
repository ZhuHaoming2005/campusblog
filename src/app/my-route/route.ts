export const runtime = 'nodejs'
export const revalidate = 300

export const GET = async () => {
  return Response.json({
    message: 'This is an example of a custom route.',
  })
}
