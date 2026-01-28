import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

// PrimeVue Noir theme preset (black primary color)
// Reference: https://primevue.org/theming/styled
const Noir = definePreset(Aura, {
  components: {
    tooltip: {
      root: {
        maxWidth: '24rem',
      },
    },
    paginator: {
      navButton: {
        width: '2rem',
        height: '2rem',
      },
    },
    button: {
      colorScheme: {
        light: {
          // Override text button hover/active background colors (raise 1 level: 50->100, 100->200)
          text: {
            primary: {
              hoverBackground: '{primary.100}',
              activeBackground: '{primary.200}',
            },
            secondary: {
              hoverBackground: '{surface.100}',
              activeBackground: '{surface.200}',
            },
            success: {
              hoverBackground: '{green.100}',
              activeBackground: '{green.200}',
            },
            info: {
              hoverBackground: '{sky.100}',
              activeBackground: '{sky.200}',
            },
            warn: {
              hoverBackground: '{orange.100}',
              activeBackground: '{orange.200}',
            },
            help: {
              hoverBackground: '{purple.100}',
              activeBackground: '{purple.200}',
            },
            danger: {
              hoverBackground: '{red.100}',
              activeBackground: '{red.200}',
            },
            contrast: {
              hoverBackground: '{surface.100}',
              activeBackground: '{surface.200}',
            },
            plain: {
              hoverBackground: '{surface.100}',
              activeBackground: '{surface.200}',
            },
          },
        },
        dark: {
          // Override text button hover/active background colors for dark mode (raise 1 level)
          text: {
            primary: {
              hoverBackground: 'color-mix(in srgb, {primary.color}, transparent 92%)',
              activeBackground: 'color-mix(in srgb, {primary.color}, transparent 76%)',
            },
            secondary: {
              hoverBackground: '{surface.700}',
              activeBackground: '{surface.600}',
            },
            success: {
              hoverBackground: 'color-mix(in srgb, {green.400}, transparent 92%)',
              activeBackground: 'color-mix(in srgb, {green.400}, transparent 76%)',
            },
            info: {
              hoverBackground: 'color-mix(in srgb, {sky.400}, transparent 92%)',
              activeBackground: 'color-mix(in srgb, {sky.400}, transparent 76%)',
            },
            warn: {
              hoverBackground: 'color-mix(in srgb, {orange.400}, transparent 92%)',
              activeBackground: 'color-mix(in srgb, {orange.400}, transparent 76%)',
            },
            help: {
              hoverBackground: 'color-mix(in srgb, {purple.400}, transparent 92%)',
              activeBackground: 'color-mix(in srgb, {purple.400}, transparent 76%)',
            },
            danger: {
              hoverBackground: 'color-mix(in srgb, {red.400}, transparent 92%)',
              activeBackground: 'color-mix(in srgb, {red.400}, transparent 76%)',
            },
            contrast: {
              hoverBackground: '{surface.700}',
              activeBackground: '{surface.600}',
            },
            plain: {
              hoverBackground: '{surface.700}',
              activeBackground: '{surface.600}',
            },
          },
        },
      },
    },
  },
  semantic: {
    primary: {
      50: '{zinc.50}',
      100: '{zinc.100}',
      200: '{zinc.200}',
      300: '{zinc.300}',
      400: '{zinc.400}',
      500: '{zinc.500}',
      600: '{zinc.600}',
      700: '{zinc.700}',
      800: '{zinc.800}',
      900: '{zinc.900}',
      950: '{zinc.950}',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{zinc.950}',
          inverseColor: '#ffffff',
          hoverColor: '{zinc.900}',
          activeColor: '{zinc.800}',
        },
        highlight: {
          background: '{zinc.950}',
          focusBackground: '{zinc.700}',
          color: '#ffffff',
          focusColor: '#ffffff',
        },
      },
      dark: {
        primary: {
          color: '{zinc.50}',
          inverseColor: '{zinc.950}',
          hoverColor: '{zinc.100}',
          activeColor: '{zinc.200}',
        },
        highlight: {
          background: 'rgba(250, 250, 250, .16)',
          focusBackground: 'rgba(250, 250, 250, .24)',
          color: 'rgba(255,255,255,.87)',
          focusColor: 'rgba(255,255,255,.87)',
        },
      },
    },
  },
})

export default {
  preset: Noir,
  options: {
    darkModeSelector: '.dark',
    cssLayer: {
      name: 'primevue',
      // Establish layer order: base < primevue < utilities
      // PrimeVue injects styles first in DOM, so this declaration sets the order before Tailwind.
      // Ensures PrimeVue components override Tailwind reset, while utilities override PrimeVue.
      order: 'theme, base, primevue',
    },
  },
}
