def insertion_sort(arr):
    for i in range(2, len(arr)):  # 2열부터 시작
        key = arr[i]  # 비교할 대상 저장
        j = i - 1
        while j >= 0 and arr[j] > key:  # 나보다 앞에 나보다 큰 수가 있는지 확인
            arr[j + 1] = arr[j]  # 나보다 큰 수가 있으면 뒤로 1칸 보냄
            j -= 1
        arr[j + 1] = key  # 루프가 끝나고 빈 자리에 나를 넣음


my_list = [12, 11, 13, 5, 6]  # 예시: 정렬할 리스트
insertion_sort(my_list)
print("정렬된 리스트:", my_list)  # 정렬된 리스트: [5, 6, 11, 12, 13]
