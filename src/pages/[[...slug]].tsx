import { CANVAS_DRAFT_STATE, CANVAS_PUBLISHED_STATE } from '@uniformdev/canvas';
import { withUniformGetServerSideProps } from '@uniformdev/canvas-next/route';
import { Page } from '@/components';
import { getBreadcrumbs, getRouteClient } from '@/utilities/canvas/canvasClients';
import { localize } from '@uniformdev/canvas';
import { UniformPreviewData } from '@uniformdev/canvas-next/.';
import { GetServerSidePropsContext } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { Locales } from '@/constants/locales';

async function redirectToDefaultLanguage() {
  return {
    redirect: {
      destination: `/${Locales.Default}`,
      permanent: false,
    },
  };
}

// SSR configuration is enabled by default
export const getServerSideProps = async (context: GetServerSidePropsContext<ParsedUrlQuery, UniformPreviewData>) => {
  const { params } = context;
  const slugPath: string | string[] | undefined = params?.slug;
  const isPreview = context.preview;
  // Check if slugPath is undefined, and if so, handle it accordingly
  if (slugPath === undefined && !isPreview) {
    return redirectToDefaultLanguage();
  }

  return withUniformGetServerSideProps({
    requestOptions: context => ({
      state: Boolean(context.preview) ? CANVAS_DRAFT_STATE : CANVAS_PUBLISHED_STATE,
    }),
    /*
    // This function is used to modify the path before it is used to fetch data
    // If we don't want to use a redirect, we can use this to modify the path
    modifyPath(path) {
      return path.length === 0 || path === '/' ? '/en' : path;
    },
    */
    client: getRouteClient(),
    handleComposition: async (routeResponse, _context) => {
      const { composition, errors } = routeResponse.compositionApiResponse || {};

      if (errors?.some(e => e.type === 'data' || e.type === 'binding')) {
        return { notFound: true };
      }

      const preview = Boolean(_context.preview);
      const breadcrumbs = await getBreadcrumbs({
        compositionId: composition._id,
        preview,
        dynamicTitle: composition?.parameters?.pageTitle?.value as string,
        resolvedUrl: _context.resolvedUrl,
      });

      const locale = routeResponse.dynamicInputs?.language || Locales.Default;
      await localize({ composition, locale });

      return {
        props: { preview, data: composition || null, context: { breadcrumbs } },
      };
    },
  })(context);
};

export default Page;

// Enable if switching to SSG mode
// import { withUniformGetStaticProps, withUniformGetStaticPaths } from '@uniformdev/canvas-next/route';
// import { getProjectMapClient } from '@/utils/canvas';

// SSG configuration - replace getServerSideProps with this if you want this mode
// export const getStaticProps = withUniformGetStaticProps({
//   requestOptions: {
//     state: process.env.NODE_ENV === 'development' ? CANVAS_DRAFT_STATE : CANVAS_PUBLISHED_STATE,
//   },
//   param: 'slug',
//   handleComposition: async (routeResponse, _context) => {
//     const { composition } = routeResponse.compositionApiResponse || {};
//     const breadcrumbs = await getBreadcrumbs(composition._id, Boolean(_context.preview));
//     return {
//       props: {
//         preview: Boolean(_context.preview),
//         data: composition || null,
//         context: {
//           breadcrumbs,
//         },
//       },
//     };
//   },
// });

// SSG configuration, add this function
// export const getStaticPaths = async () => {
//   const nodePaths = await withUniformGetStaticPaths({
//     preview: process.env.NODE_ENV === 'development',
//     client: getProjectMapClient(),
//   });
//   const { paths } = await nodePaths();
//   return {
//     paths,
//     fallback: 'blocking',
//   };
// };
