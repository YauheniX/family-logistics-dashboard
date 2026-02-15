<template>
  <div class="min-h-screen bg-white dark:bg-dark-bg text-neutral-900 dark:text-neutral-50">
    <div class="flex min-h-screen">
      <!-- Sidebar Navigation (Desktop) -->
      <aside
        class="hidden w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-5 py-6 lg:block"
      >
        <!-- Logo/Brand -->
        <div class="mb-6">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-2xl" aria-hidden="true">🏡</span>
            <h2 class="text-xl font-bold text-neutral-900 dark:text-neutral-50">FamilyBoard</h2>
          </div>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 ml-8">
            Keeping families connected
          </p>
        </div>

        <!-- Current Household Display -->
        <div
          class="mb-6 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/40 dark:to-primary-800/40 p-4 border border-primary-200 dark:border-primary-700"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xl" aria-hidden="true">🏠</span>
            <p class="font-semibold text-neutral-900 dark:text-neutral-50 truncate">
              Smith Family
            </p>
          </div>
          <p class="text-xs text-neutral-600 dark:text-neutral-400 capitalize ml-7">
            owner
          </p>
        </div>

        <!-- Navigation -->
        <nav class="space-y-1">
          <div
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800"
          >
            <span class="text-lg" aria-hidden="true">🏠</span>
            <span>Home</span>
          </div>
          <div
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            <span class="text-lg" aria-hidden="true">👨‍👩‍👧‍👦</span>
            <span>Members</span>
          </div>
          <div
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            <span class="text-lg" aria-hidden="true">🛒</span>
            <span>Shopping</span>
          </div>
          <div
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            <span class="text-lg" aria-hidden="true">🎁</span>
            <span>Wishlists</span>
          </div>
          <div
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            <span class="text-lg" aria-hidden="true">⚙️</span>
            <span>Settings</span>
          </div>
        </nav>
      </aside>

      <main class="flex-1 pb-16 lg:pb-0">
        <!-- Header -->
        <header
          class="flex items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 md:px-6 md:py-4"
        >
          <div class="flex min-w-0 items-center gap-2 md:gap-3">
            <button
              class="lg:hidden px-2 py-1 text-neutral-700 dark:text-neutral-300"
              aria-label="Open navigation"
            >
              ☰
            </button>
            
            <!-- Household Switcher (Desktop) -->
            <div class="hidden md:block relative">
              <button
                class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <span class="text-lg" aria-hidden="true">🏠</span>
                <span class="max-w-[150px] truncate">Smith Family</span>
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            <h1 class="truncate text-lg font-semibold text-neutral-900 dark:text-neutral-50 md:text-xl">
              Home
            </h1>
          </div>
          
          <div class="flex items-center gap-2 md:gap-3">
            <div
              class="flex items-center gap-2 border-l border-neutral-200 dark:border-neutral-700 pl-2 md:gap-3 md:pl-3"
            >
              <div class="hidden md:block text-right">
                <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  demo@example.com
                </p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">Signed in</p>
              </div>
            </div>
          </div>
        </header>
        
        <!-- Breadcrumbs -->
        <div class="px-4 py-2 md:px-6 border-b border-neutral-100 dark:border-neutral-700/50">
          <nav class="flex items-center gap-2 text-sm">
            <span class="text-neutral-900 dark:text-neutral-50 font-medium">Home</span>
          </nav>
        </div>

        <!-- Content -->
        <section class="p-4 md:p-6">
          <div class="max-w-4xl">
            <div class="mb-6">
              <h2 class="text-2xl font-bold mb-2 flex items-center gap-2">
                <span>👋</span>
                Welcome to FamilyBoard!
              </h2>
              <p class="text-neutral-600 dark:text-neutral-400">
                Your redesigned navigation for multi-household family management
              </p>
            </div>

            <!-- Demo Stats Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div class="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 p-6 border border-blue-200 dark:border-blue-700">
                <div class="text-3xl mb-2">3</div>
                <div class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Active Lists</div>
              </div>
              <div class="rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40 p-6 border border-green-200 dark:border-green-700">
                <div class="text-3xl mb-2">12</div>
                <div class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Items To Buy</div>
              </div>
              <div class="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40 p-6 border border-purple-200 dark:border-purple-700">
                <div class="text-3xl mb-2">5</div>
                <div class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Members</div>
              </div>
              <div class="rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 p-6 border border-orange-200 dark:border-orange-700">
                <div class="text-3xl mb-2">2</div>
                <div class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Pending Invites</div>
              </div>
            </div>

            <!-- Features List -->
            <div class="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
              <h3 class="text-lg font-semibold mb-4">New Navigation Features</h3>
              <ul class="space-y-3">
                <li class="flex items-start gap-3">
                  <span class="text-green-500">✓</span>
                  <div>
                    <strong>Household Switcher:</strong> Easily switch between multiple households with dropdown in header
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-green-500">✓</span>
                  <div>
                    <strong>Mobile Bottom Navigation:</strong> Touch-friendly navigation bar at bottom on mobile devices
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-green-500">✓</span>
                  <div>
                    <strong>Breadcrumbs:</strong> Always know where you are with contextual breadcrumb navigation
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-green-500">✓</span>
                  <div>
                    <strong>Warm & Friendly Design:</strong> Family-oriented emojis and warm colors instead of corporate feel
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-green-500">✓</span>
                  <div>
                    <strong>Role-Based Context:</strong> Navigation adapts to your role in each household (owner, admin, member, child, viewer)
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-green-500">✓</span>
                  <div>
                    <strong>Keyboard Shortcuts:</strong> Press Cmd/Ctrl + K to quickly open household switcher
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- Mobile Bottom Navigation -->
    <nav
      class="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-2"
    >
      <div class="flex items-center justify-around">
        <div class="flex flex-col items-center gap-1 px-3 py-1 text-primary-600 dark:text-primary-400">
          <span class="text-xl" aria-hidden="true">🏠</span>
          <span class="text-xs font-medium">Home</span>
        </div>
        <div class="flex flex-col items-center gap-1 px-3 py-1 text-neutral-600 dark:text-neutral-400">
          <span class="text-xl" aria-hidden="true">🛒</span>
          <span class="text-xs font-medium">Shopping</span>
        </div>
        <div class="flex flex-col items-center gap-1 px-3 py-1 text-neutral-600 dark:text-neutral-400">
          <span class="text-xl" aria-hidden="true">🎁</span>
          <span class="text-xs font-medium">Wishlists</span>
        </div>
        <div class="flex flex-col items-center gap-1 px-3 py-1 text-neutral-600 dark:text-neutral-400">
          <span class="text-xl" aria-hidden="true">👥</span>
          <span class="text-xs font-medium">Members</span>
        </div>
        <div class="flex flex-col items-center gap-1 px-3 py-1 text-neutral-600 dark:text-neutral-400">
          <span class="text-xl" aria-hidden="true">⋯</span>
          <span class="text-xs font-medium">More</span>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
// Demo view - no logic needed
</script>
