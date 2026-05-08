# Hidden Post Preview Design

**Goal**

Allow signed-in authors to find their hidden posts in the user center, preview them through the existing `/post/[slug]` route, and permanently delete them from the same dashboard.

**Scope**

- Frontend user center at `src/app/(frontend)/user/me/page.tsx`
- Existing user post action component used in the dashboard
- Frontend post detail route at `src/app/(frontend)/post/[slug]/page.tsx`
- Frontend CMS data access used by the post detail page
- Frontend copy and tests related to the dashboard and post detail access

**Behavior**

- The user center keeps its current draft and published sections and adds a third section for posts whose `status` is `hidden`.
- Hidden posts are only queried for the current signed-in author.
- Each hidden post row exposes two actions:
  - `Preview`, which links to `/post/[slug]`
  - `Delete`, which reuses the existing delete confirmation and `DELETE /api/editor/posts/[id]`
- Hidden posts remain non-editable from the frontend editor flow. The current `/editor?draft=<id>` behavior continues to accept draft posts only.
- The `/post/[slug]` route keeps public access for published posts and additionally allows the author of a hidden post to open the same page while signed in.
- Other users, including anonymous visitors, must not be able to view hidden posts by slug. They should continue to receive the existing not-found behavior.

**Implementation Approach**

- Extend the user center server query set from two buckets to three: `draft`, `published`, and `hidden`.
- Reuse the existing `UserPostList` rendering path so hidden posts inherit the same quota display, delete affordance, and overall card layout.
- Add hidden-post copy to both locale dictionaries instead of hard-coding labels in the page.
- Introduce a post-detail data access path that can resolve:
  - published posts for everyone
  - hidden posts only when the requesting frontend user is also the author
- Keep the authorization check on the server side by passing the current frontend user into the Payload Local API with `overrideAccess: false`, matching the project's Payload access-control rule.
- Preserve related-post behavior as published-only so hidden content does not leak into recommendation rails.

**Testing**

- Add user-center integration coverage that checks the page source includes a hidden-post section and uses `/post/${post.slug}` as the action target for hidden posts.
- Add post-detail data or page-level integration coverage for these cases:
  - published posts still resolve normally
  - a hidden post resolves for its author
  - the same hidden post does not resolve for another user or an anonymous request
- Keep existing delete-action component coverage and extend it only if needed for the preview label variant.
- Run the targeted test files first as failing tests, then implement, then re-run them.
- Run `tsc --noEmit` before completion.

**Out of Scope**

- Allowing hidden posts to be edited from the frontend editor
- Introducing a separate preview-only route
- Changing collection schema or post status semantics
- Broadening hidden-post visibility to admins in the frontend unless already implied by existing frontend session behavior
