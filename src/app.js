// CSS
import './styles/app.css';


import 'web-component-polyomino';

import { mount } from 'svelte';
import App from './App.svelte';
const app = mount(App, {
    target: document.body,
});
