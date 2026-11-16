export type ContentPageIndexLink =
    | {
          to: '/{-$locale}/cities' | '/{-$locale}/blog-posts';
          label: string;
      }
    | {
          to: '/{-$locale}/coming-to/$country';
          params: { country: 'netherlands' | 'switzerland' };
          label: string;
      };
