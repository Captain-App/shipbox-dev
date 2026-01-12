import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.shipbox.dev',
	integrations: [
		starlight({
			title: 'Shipbox',
			logo: {
				src: './src/assets/favicon.svg',
			},
			customCss: [
				'./src/styles/custom.css',
			],
			social: {
				github: 'https://github.com/crew/shipbox-dev',
			},
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Shipbox Overview', link: '/' },
						{ label: 'Quickstart Guide', link: '/guides/quickstart', badge: { text: 'New', variant: 'success' } },
					],
				},
				{
					label: 'Core Concepts',
					items: [
						{ label: 'Agent Sandboxes', link: '/guides/creating-sandbox' },
						{ label: 'Autonomous Mode', link: '/guides/autonomous-mode' },
					],
				},
				{
					label: 'Platform Features',
					items: [
						{ label: 'Dashboard', link: '/features/dashboard' },
						{ label: 'Workspace', link: '/features/workspace' },
						{ label: 'Settings & Secrets', link: '/features/settings' },
						{ label: 'Billing & Credits', link: '/features/billing' },
					],
				},
				{
					label: 'API Reference',
					items: [
						{ label: 'Overview', link: '/api/overview' },
						{ label: 'Endpoints', link: '/api/endpoints' },
					],
				},
			],
		}),
	],
});
