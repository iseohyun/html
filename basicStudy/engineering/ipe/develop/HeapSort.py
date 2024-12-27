def heapify(arr, n, i):  # 그룹에서 가장 큰 노드를 부모노드에 위치시킨다.
    largest = i  # 부모노드
    left = 2 * i + 1  # 자식(왼쪽)
    right = 2 * i + 2  # 자식(오른쪽)
    if left < n and arr[left] > arr[largest]:
        largest = left
    if right < n and arr[right] > arr[largest]:
        largest = right
    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify(arr, n, largest)  # 작은수로 대체된 자식노드에 대해서 정렬 수행


def heap_sort(arr):
    n = len(arr)
    for i in range(
        n // 2 - 1, -1, -1
    ):  # 최대 힙 구성 n//2-1부터 0까지 -1씩 증가(자식이 있는 애부터)
        heapify(arr, n, i)  # 주어진 그룹에서, i번째에 가장 큰 숫자를 넣는다.
    # 가장 큰 녀석이 공통부모에 있음
    for i in range(n - 1, 0, -1):  # 맨 끝부터 -1씩 맨 처음까지
        arr[i], arr[0] = arr[0], arr[i]  # 최대값(우승자)를 맨 뒤로 보냄(고정)
        heapify(arr, i, 0) # 작년 우승자 빼고, 결승전만 실행(제일 큰 녀석이 공통부모에 감)
    return arr


# 1세대:                                   0:공통부모,
# 2세대:                    1:좌,                              2:우,
# 3세대:      3:좌좌,             4:좌우,               5:우좌,                   6:우우,
# 4세대: 7:좌좌좌, 8:좌좌우, 9:좌우좌, 10:좌우우, 11:우좌좌, 12: 우좌우, 13: 우우좌, 14: 우우우
# 그룹 예: [0:공통부모, 1:좌, 2:우], [2:우, 5:우좌, 6:우우], [5:우좌, 11: 우좌좌, 12: 우좌우]
# 그룹 일반식 : [n, 2n+1, 2n+2]
arr = [12, 11, 13, 5, 6, 7, 1, 16]  # 예시 : 정렬할 리스트
sorted_arr = heap_sort(arr)
print("정렬된 배열:", sorted_arr)  # 정렬된 배열: [1, 5, 6, 7, 11, 12, 13, 16]
