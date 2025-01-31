import { renderHook, act } from 'react-hooks-testing-library'
import useQuery from '../src/use-query';
import { 
	FIRST_FETCH,
	FETCHING_MORE,
	REFETCHING,
	POLLING,
	READY,
	ERROR 
} from '../src/utils/loading-status';

const okFetch = jest.fn();
okFetch.mockResolvedValue({ data: [1,2,3]});

const errFetch = jest.fn();
errFetch.mockRejectedValue(new Error('nel'));

const customFetch = jest.fn();

const restResultPage1 = { 
	data: {
		users: [{
			name: 'User 1'
		}, {
			name: 'User 2'
		}, {
			name: 'User 3'
		}]
	} 
}
const restResultPage2 = { 
	data: {
		users: [{
			name: 'User 4'
		}, {
			name: 'User 5'
		}, {
			name: 'User 6'
		}]
	} 
};

let updateParams = ({ result }) => {
	return { offset: result.data.users.length }
}
let updateResult = (oldResult, newResult) => {
	return { users: oldResult.data.users.concat(newResult.data.users) }
}

describe('use-query hook', () => {
	it('is truthy', () => {
		expect(useQuery).toBeTruthy()
	});

	it('renders without crashing', () => {
		let { result } = renderHook(() => useQuery(okFetch));
	});

	describe('When first fetching', () => {
		it('returns an object with error, isLoading & data', () => {
			let { result: { current } } = renderHook(() => useQuery(okFetch));
			expect(current.error).toBe(null);
			expect(current.result).toBe(null);
			expect(current.loadingStatus).toBe(FIRST_FETCH);
			expect(current.isLoading).toBe(true);
		});

		it('calls its passed function only once', () => {
			let { result } = renderHook(() => useQuery(okFetch));
			expect(okFetch).toBeCalledTimes(1);
		});

		describe('when the promise resolves', () => {
			let { result, waitForNextUpdate } = renderHook(() => useQuery(okFetch));

			it('sets isLoading to false', async () => {
				expect(result.current.isLoading).toBe(false);
			});
			it('keeps error as null', () => {
				expect(result.current.error).toBe(null);
			});
			it('sets the resolved value to data', () => {
				expect(result.current.result).toEqual({ data: [1,2,3]});
			});
			it('sets the loadingStatus to READY', async () => {
				expect(result.current.loadingStatus).toBe(READY);
			});
		});

		describe('when the promise rejects', () => {
			let { result } = renderHook(() => useQuery(errFetch));
			it('sets isLoading to false', async () => {
				expect(result.current.isLoading).toBe(false);
			});
			it('sets the error to error', async () => {
				expect(result.current.error).toBeTruthy();
			});
			it('sets the loadingStatus to ERROR', async () => {
				expect(result.current.loadingStatus).toBe(ERROR);
			});
		});
	});

	describe('when refetching', () => {

		describe('While request is in flight', () => {
			let hook, refetchStarted;
			beforeEach(() => {
				hook = renderHook(() => useQuery(okFetch));
				refetchStarted = new Promise(async (resolve) => {
					await hook.waitForNextUpdate(); // first fetch
					hook.result.current.refetch();
					resolve();
				});
			});

			it('sets isReloading to true, resets clears errors & sets loadingStatus to REFETCHING', async () => {
				await refetchStarted;
				expect(hook.result.current.loadingStatus).toBe(REFETCHING);
				expect(hook.result.current.isReloading).toBe(true);
				expect(hook.result.current.error).toBe(null);
			});
			it('calls the passed function only once', async () => {
				await refetchStarted;
				expect(okFetch).toBeCalledTimes(2); // first fetch + refetch
			});
		});

		describe('when the promise resolves', () => {
			let hook, refetchResolved;
			beforeEach(() => {
				hook = renderHook(() => useQuery(okFetch));
				refetchResolved = new Promise(async (resolve) => {
					await hook.waitForNextUpdate(); // first fetch
					hook.result.current.refetch();
					await hook.waitForNextUpdate();
					resolve();
				});
			});

			it('sets isReloading to false', async () => {
				await refetchResolved;
				expect(hook.result.current.isReloading).toBe(false);
			});
			it('keeps error as null', async () => {
				await refetchResolved;
				expect(hook.result.current.error).toBe(null);
			});
			it('sets the resolved value to data', async () => {
				await refetchResolved;
				expect(hook.result.current.result).toEqual({ data: [1,2,3]});
			});
			it('sets the loadingStatus to READY', async () => {
				await refetchResolved;
				expect(hook.result.current.loadingStatus).toBe(READY);
			});
		});

		describe('when the promise rejects', () => {
			let hook, refetchRejected;
			beforeEach(async () => {
				hook = renderHook(() => useQuery(errFetch));
				refetchRejected = new Promise(async (resolve) => {
					await hook.waitForNextUpdate(); // first fetch
					hook.result.current.refetch();
					await hook.waitForNextUpdate();
					resolve();
				});
			});

			it('sets isReloading to false', async () => {
				await refetchRejected;
				expect(hook.result.current.isReloading).toBe(false);
			});
			it('sets the error to error', async () => {
				await refetchRejected;
				expect(hook.result.current.error).toBeTruthy();
			});
			it('sets the loadingStatus to ERROR', async () => {
				await refetchRejected;
				expect(hook.result.current.loadingStatus).toBe(ERROR);
			});
		});
	});

	describe('when fetching more', () => {
		describe('when request is in flight', () => {
			let hook, fetchMoreStarted;
			beforeEach(() => {
				hook = renderHook(() => useQuery(okFetch));
				
				fetchMoreStarted = new Promise(async (resolve) => {
					await hook.waitForNextUpdate();
					hook.result.current.fetchMore();
					resolve();
				});
			});

			it('sets isLoadingMore to true, sets loadingStatus to FETCHING_MORE', async () => {
				await fetchMoreStarted;
				expect(hook.result.current.loadingStatus).toBe(FETCHING_MORE);
				expect(hook.result.current.isLoadingMore).toBe(true);
				expect(hook.result.current.error).toBe(null);
			});
			it('calls the passed funciton only once', async () => {
				await fetchMoreStarted;
				expect(okFetch).toBeCalledTimes(2);
			});
			it('calls the passed function with the default pagination params', async () => {
				await fetchMoreStarted;
				expect(okFetch).toBeCalledWith({});
				expect(okFetch).toBeCalledWith({ start: 3 });
			});
		})

		describe('when the promise resolves', () => {
			let result, promise;
			beforeEach(async () => {
				okFetch.mockResolvedValueOnce({ data: [1,2,3] });
				okFetch.mockResolvedValueOnce({ data: [4,5,6] });
				let hook = renderHook(() => useQuery(okFetch));
				result = hook.result;
				promise = new Promise(async (resolve) => {
					await hook.waitForNextUpdate();
					await result.current.fetchMore();
					resolve();
				});
			});

			it('sets isLoadingMore to false', async () => {
				await promise;
				expect(result.current.isLoadingMore).toBe(false);
			});
			it('keeps error as null', async () => {
				await promise;
				expect(result.current.error).toBe(null);
			});
			it('sets the resolved value to data', async () => {
				await promise;
				expect(result.current.result).toEqual({ data: [1,2,3,4,5,6]});
			});
			it('sets the loadingStatus to READY', async () => {
				await promise;
				expect(result.current.loadingStatus).toBe(READY);
			});
		});

		describe('when the promise rejects', () => {
			let result, promise;
			beforeEach(async () => {
				errFetch.mockResolvedValueOnce({ data: [1,2,3] });
				errFetch.mockRejectedValueOnce(new Error('nel pastel'));

				let hook = renderHook(() => useQuery(errFetch));
				result = hook.result;
				promise = new Promise(async (resolve) => {
					await hook.waitForNextUpdate();
					await result.current.fetchMore();
					resolve();
				});
			});

			it('sets isLoadingMore to false', async () => {
				await promise;
				expect(result.current.isLoadingMore).toBe(false);
			});
			it('sets error', async () => {
				await promise;
				expect(result.current.error).toBeTruthy();
			});
			it("result doesn't change", async () => {	
				await promise;
				expect(result.current.result).toEqual({ data: [1,2,3] });
			});
			it('sets the loadingStatus to ERROR', async () => {
				await promise;
				expect(result.current.loadingStatus).toBe(ERROR);
			});
		})
	});
	describe('when fetching more with customFetch', () => {
		let result, promise;
		beforeAll(async () => {
			customFetch.mockResolvedValueOnce(restResultPage1);
			customFetch.mockResolvedValueOnce(restResultPage2);
			let hook = renderHook(() => useQuery(customFetch));
			result = hook.result;
			promise = new Promise(async (resolve) => {
				await hook.waitForNextUpdate();
				await result.current.fetchMore({ updateParams, updateResult });
				resolve();
			});
		})
		it('merges results correctly when fetchingMore in a customFetch', async () => {
			await promise;
			expect(result.current.result).toEqual({ users: restResultPage1.data.users.concat(restResultPage2.data.users) });
		});
	});

	describe('when fetching more with query options param', () => {
		let result, promise;
		beforeAll(async () => {
			customFetch.mockResolvedValueOnce(restResultPage1);
			customFetch.mockResolvedValueOnce(restResultPage2);
			let hook = renderHook(() => useQuery(customFetch, { updateParams, updateResult }));
			result = hook.result;
			promise = new Promise(async (resolve) => {
				await hook.waitForNextUpdate();
				await result.current.fetchMore();
				resolve();
			});
		});
		it('merges results correctly when fetchingMore with query options param', async () => {
			await promise;
			expect(result.current.result).toEqual({ users: restResultPage1.data.users.concat(restResultPage2.data.users) });
		});
	});

	describe('when polling', () => {
		let hook, pollStarted;

		beforeEach(() => {
			hook = renderHook(() => useQuery(okFetch, { pollInterval: 500 }));
			pollStarted = new Promise(async (resolve) => {
				hook.waitForNextUpdate().then(() => {
					hook.waitForNextUpdate().then(() => {
						console.log(hook.result.current.loadingStatus)
						resolve();
					});
				});
				// await hook.waitForNextUpdate();
				// await hook.waitForNextUpdate();
				resolve();
			});
		});

		// it('works', async () => {
		// 	// console.log(pollStarted)
		// 	await pollStarted;

		// 	// console.log(pollStarted)
		// 	// await hook.waitForNextUpdate();
		// 	expect(hook.result.current.loadingStatus).toBe(POLLING);
		// 	expect(hook.result.current.isReloading).toBe(false);
		// 	expect(hook.result.current.error).toBe(null);
		// });
		// let hook, pollStarted/*, pollCompleted*/;
		// beforeEach(() => {
		// 	hook = renderHook(() => useQuery(okFetch, { pollInterval: 100 }));

		// 	pollStarted = new Promise(async (resolve) => {
		// 		await hook.waitForNextUpdate(); // first fetch
		// 		await hook.waitForNextUpdate(); // first poll
		// 		resolve();
		// 	});
			// pollCompleted = new Promise(async (resolve) => {
			// 	await pollStarted;
			// 	await hook.waitForNextUpdate();
			// 	resolve();
			// });
		// });

		// afterEach(() => {
		// 	hook.unmount();
		// });

		// it('waits until first fetch is finished to do polling', async () => {
		// 	await pollStarted;
		// 	expect(hook.result.current.loadingStatus).toBe(POLLING);
		// });

		// it('updates data with new result', async () => {
		// 	okFetch.mockResolvedValueOnce({ data: ['updated', 2, 3] });
		// 	await pollCompleted;
		// 	expect(hook.result.current.result).toEqual({ data: ['updated', 2, 3] });
		// });

		// it('stops & resumes polling with stopPolling & startPolling', async () => {
		// 	await pollCompleted;
		// 	expect(okFetch).toBeCalledTimes(2); // inial fetch & first poll;
		// 	hook.result.current.stopPolling();
		// 	await new Promise(resolve => setTimeout(resolve, 200));
		// 	expect(okFetch).toBeCalledTimes(2);
		// 	hook.result.current.startPolling();
		// 	await new Promise(resolve => setTimeout(resolve, 200));
		// 	expect(okFetch).toBeCalledTimes(3);
		// });
	});
});

//This is a little hack to silence a warning until react fixes 
//this: https://github.com/facebook/react/pull/14853
const originalError = console.error;
beforeAll(() => {
	console.error = (...args) => {
		if (/Warning.*not wrapped in act/.test(args[0])) {
			return;
		}
		originalError.call(console, ...args);
	}
});

// afterAll(() => {
// 	console.error = originalError;
// });