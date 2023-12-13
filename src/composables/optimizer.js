

export function useOptimizer() {
  const optimize = async () => {
    console.log('Optimizing...')

    setTimeout(() => {
      console.log('Optimized!')
    }, 2000)
  }

  const reoptimize = async () => {

  }

  return { optimize, reoptimize }
}