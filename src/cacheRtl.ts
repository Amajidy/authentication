import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';

export default createCache({
    key: 'mui-rtl',
    stylisPlugins: [prefixer, rtlPlugin],
});
