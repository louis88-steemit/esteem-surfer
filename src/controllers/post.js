export default ($scope, $rootScope, $routeParams, $timeout, $uibModal, $location, $q, steemService, helperService, constants) => {

  let parent = $routeParams.parent;
  let author = $routeParams.author;
  let permlink = $routeParams.permlink;
  let commentId = parseInt($routeParams.comment);

  let routePath = `/${parent}/@${author}/${permlink}`;
  let contentPath = `${author}/${permlink}`;

  let pathData = {};

  let commentsData = [];

  const commentsPerPage = constants.commentListSize;

  $scope.commentsLength = 0; // Length of compiled comments array (Not total comments count)
  $scope.commentsHasPrev = false;
  $scope.commentsHasNext = false;
  $scope.commentsCurPage = 1;
  $scope.commentsTotalPages = 0;


  const compileComments = (parent, sortField = 'pending_payout_value') => {
    let comments = [];
    for (let k of parent.replies) {

      let reply = pathData.content[k];

      comments.push(
        Object.assign(
          {},
          reply,
          {comments: compileComments(reply)},
          {author_data: pathData.accounts[reply.author]},
          {_selected_: reply.id === commentId}
        )
      )
    }

    comments.sort(function (a, b) {
      let keyA = a[sortField],
        keyB = b[sortField];

      if (keyA > keyB) return -1;
      if (keyA < keyB) return 1;
      return 0;
    });

    return comments
  };

  const loadState = () => {
    return steemService.getState(routePath).then(stateData => {
      pathData = stateData;

      let content = stateData.content[contentPath];
      $scope.post = content;

      $scope.author = pathData.accounts[author];
      commentsData = compileComments(content);

      $scope.commentsLength = commentsData.length;
      $scope.commentsTotalPages = Math.ceil(commentsData.length / commentsPerPage);
      $scope.sliceComments();

      if (commentId) {
        // If comment specified (coming from author detail page comments or replies)
        // find out comment row and move pagination according to it's place.

        let i = 1;
        let commentPlace = null;
        for (let k of commentsData) {
          if (k.id === commentId) {
            commentPlace = i;
            break;
          } else {
            // TODO: Find better approach like recursive lookup.
            let j = JSON.stringify(k);
            if (j.match(new RegExp(`"id": ?${commentId},`))) {
              commentPlace = i;
              break;
            }
          }
          i += 1;
        }

        if (commentPlace) {
          // Find out which page comment is on and set forward the pagination
          let commentPage = Math.ceil(commentPlace / commentsPerPage);
          if (commentPage > 1) {
            $scope.commentsGoPage(commentPage);
          }

          // Scroll page to selected comment
          $timeout(() => {
            scrollToSelectedComment();
          }, 500)
        }

      }
    })
  };

  const scrollToComments = () => {
    let e = document.querySelector('#content-main');
    e.scrollTop = e.scrollHeight;
  };

  const scrollToSelectedComment = () => {
    let e = document.querySelector('#content-main');
    let c = document.querySelector('.comment-list-item.selected');
    e.scrollTop = (c.offsetTop - 200);
  };

  $scope.commentsGoPage = (page) => {
    $scope.commentsCurPage = page;
    $scope.sliceComments();
  };

  $scope.commentsGoNext = () => {
    $scope.commentsCurPage += 1;
    $scope.sliceComments();
  };

  $scope.commentsGoPrev = () => {
    $scope.commentsCurPage -= 1;
    $scope.sliceComments();
  };

  $scope.sliceComments = () => {
    let start = ( $scope.commentsCurPage - 1) * commentsPerPage;
    let end = start + commentsPerPage;

    $scope.comments = commentsData.slice(start, end);

    $scope.commentsHasPrev = $scope.commentsCurPage > 1;
    $scope.commentsHasNext = $scope.commentsCurPage < $scope.commentsTotalPages;
  };

  $scope.post = $rootScope.Data['post'] || null;

  let init = () => {
    let defer = $q.defer();

    if ($scope.post) {
      defer.resolve($scope.post);
    } else if ($rootScope.selectedPost.permlink === permlink && $rootScope.selectedPost.author === author) {
      // The last selected post from list === this post
      defer.resolve($rootScope.selectedPost);
    } else {
      // When clicked outside from posts lists (post body) or refreshed in development environment
      steemService.getContent(author, permlink).then((resp) => {
        defer.resolve(resp);
      }).catch((e) => {
        defer.reject(e)
      })
    }
    return defer.promise;
  };

  $scope.loadingPost = true;
  $scope.loadingRest = true;

  init().then((content) => {
    $scope.post = content;

    // Defined separately because $scope.post will be changed after state loaded.
    $scope.title = content.title;
    $scope.body = content.body;

    // Sometimes tag list comes with duplicate items. Needs to singularize.
    $scope.tags = [...new Set(JSON.parse($scope.post.json_metadata).tags)];

    // Temporary author data while loading original in background
    $scope.author = {name: $scope.post.author};

    $scope.loadingPost = false;

    loadState().catch((e) => {
      // TODO: Handle catch
    }).then(() => {
      $scope.loadingRest = false;
    });

    // Mark post as read
    helperService.setPostRead(content.id);

    // Add to nav history
    $rootScope.setNavVar('post', content);


    if (commentId) {
      // Scroll page to comments section
      $timeout(() => {
        scrollToComments();
      }, 800)
    }
  });

  $scope.parentClicked = () => {
    let u = `/posts/${$rootScope.selectedFilter}/${$scope.post.parent_permlink}`;
    $location.path(u);
  };

  $scope.tagClicked = (tag) => {
    let u = `/posts/${$rootScope.selectedFilter}/${tag}`;
    $location.path(u);
  };

  $scope.markdownHelperClicked = () => {
    let m = $scope.post.body;
    $rootScope.saveMarkdownResult($scope.post.id, m);
  };

  $scope.commentId = commentId;
};