import { createFileRoute } from '@tanstack/react-router';

import { serverRuntimeGet } from '../../../../server/graphql/server';
import { whatsappLinkResponseCreate } from '../../../../server/utils/whatsappLink';

export const Route = createFileRoute('/api/whatsapp/links/$token')({
    server: {
        handlers: {
            GET: ({ params, request }) => whatsappLinkResponseCreate(serverRuntimeGet(), params.token, request),
            HEAD: ({ params, request }) => whatsappLinkResponseCreate(serverRuntimeGet(), params.token, request),
        },
    },
});
