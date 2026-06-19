const worker = {
  async fetch() {
    return new Response('Not found', { status: 404 })
  },
}

export default worker
