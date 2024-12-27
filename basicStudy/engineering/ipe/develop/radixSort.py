def counting_sort(arr, exp):
    n = len(arr)
    output = [0] * n
    count = [0] * 10

    for i in range(n):  # 각 자릿수 별로 빈도수 계산
        index = arr[i] // exp
        count[index % 10] += 1

    for i in range(1, 10):  # 각 자릿수 별로 누적 빈도수 계산
        count[i] += count[i - 1]

    # 원래 배열을 순회하면서 정렬된 배열에 값 할당
    i = n - 1
    while i >= 0:
        index = arr[i] // exp
        output[count[index % 10] - 1] = arr[i]
        count[index % 10] -= 1
        i -= 1
    #print(exp, output) # 테스트코드: 자릿수, 정렬결과

    # 정렬된 배열을 원래 배열에 복사
    for i in range(n):
        arr[i] = output[i]


def radix_sort(arr):
    max_value = max(arr)  # 최댓값 찾기: 이미 알고 있거나 예측가능하다고 가정

    exp = 1  # 각 자릿수 별로 counting sort 수행
    while max_value // exp > 0:
        counting_sort(arr, exp)
        exp *= 10

    return arr


arr = [170, 45, 75, 90, 802, 24, 2, 66]  # 예시: 정렬할 리스트
sorted_arr = radix_sort(arr)
print("정렬된 배열:", sorted_arr)  # 정렬된 배열: [2, 24, 45, 66, 75, 90, 170, 802]
